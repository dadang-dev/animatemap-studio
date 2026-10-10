import maplibregl, {
  type GeoJSONSource,
  type StyleSpecification,
} from 'maplibre-gl';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { Camera, Layer, Project } from '@animatemap/project-schema';
export type Countries = FeatureCollection<
  Polygon | MultiPolygon,
  { code: string; name: string; labelLng: number; labelLat: number }
>;
export const palettes = {
  dark: { ocean: '#101e2d', land: '#273e4a', border: '#48606a' },
  light: { ocean: '#dae8ee', land: '#f5f2e9', border: '#b3c1bd' },
  muted: { ocean: '#24262e', land: '#44434b', border: '#6f6c76' },
};
export function makeStyle(
  style: Project['map']['styleId'],
  countries: Countries,
): StyleSpecification {
  const p = palettes[style];
  return {
    version: 8,
    sources: { countries: { type: 'geojson', data: countries } },
    layers: [
      {
        id: 'ocean',
        type: 'background',
        paint: { 'background-color': p.ocean },
      },
      {
        id: 'countries-fill',
        type: 'fill',
        source: 'countries',
        paint: { 'fill-color': p.land },
      },
      {
        id: 'countries-border',
        type: 'line',
        source: 'countries',
        paint: { 'line-color': p.border, 'line-width': 0.7 },
      },
    ],
  };
}
export function readCamera(map: maplibregl.Map): Camera {
  const c = map.getCenter();
  return {
    lng: ((c.lng + 540) % 360) - 180,
    lat: c.lat,
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  };
}
export class MapRenderer {
  readonly map: maplibregl.Map;
  private overlays: HTMLDivElement;
  private layerIds: string[] = [];
  private project?: Project;
  private layers: Layer[] = [];
  private error?: string;
  constructor(
    container: HTMLElement,
    readonly countries: Countries,
    camera: Camera,
    onCountry?: (code: string) => void,
    onCamera?: (camera: Camera) => void,
    onPoint?: (point: [number, number]) => void,
    private onLayer?: (id: string) => void,
  ) {
    this.map = new maplibregl.Map({
      container,
      style: makeStyle('dark', countries),
      center: [camera.lng, camera.lat],
      zoom: camera.zoom,
      bearing: camera.bearing,
      pitch: camera.pitch,
      maxPitch: 60,
      maxZoom: 18,
      attributionControl: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
      fadeDuration: 0,
    });
    this.overlays = document.createElement('div');
    this.overlays.className = 'map-overlays';
    container.append(this.overlays);
    this.map.on('error', (e) => {
      this.error = e.error.message;
    });
    this.map.getCanvas().addEventListener('webglcontextlost', () => {
      this.error = 'WebGL context lost. Reload to restore the map.';
    });
    this.map.on('move', () => this.drawOverlays());
    this.map.on('moveend', (e) => {
      if (e.originalEvent) onCamera?.(readCamera(this.map));
    });
    this.map.on('click', (e) => {
      const f = this.map.queryRenderedFeatures(e.point, {
        layers: ['countries-fill'],
      })[0];
      if (f?.properties?.code) onCountry?.(String(f.properties.code));
      const hit = this.map.queryRenderedFeatures(e.point).find((feature) => this.layerIds.some((id) => feature.layer.id === `${id}-line` || feature.layer.id === `${id}-fill`));
      if (hit) { const id = this.layerIds.find((id) => hit.layer.id === `${id}-line` || hit.layer.id === `${id}-fill`); if (id) this.onLayer?.(id); }
      onPoint?.([((e.lngLat.lng + 540) % 360) - 180, e.lngLat.lat]);
    });
  }
  async ready(timeoutMs = 15000) {
    await document.fonts.ready;
    const start = performance.now();
    await new Promise<void>((resolve, reject) => {
      const check = () => {
        if (this.error) return reject(new Error(this.error));
        if (this.map.loaded() && this.map.areTilesLoaded()) return resolve();
        if (performance.now() - start > timeoutMs)
          return reject(new Error('Map resources timed out'));
        requestAnimationFrame(check);
      };
      check();
    });
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  }
  apply(project: Project, camera: Camera, layers: Layer[], jump = true) {
    this.project = project;
    this.layers = layers;
    if (!this.map.getLayer('countries-fill')) return;
    const p = palettes[project.map.styleId];
    this.map.setPaintProperty('ocean', 'background-color', p.ocean);
    this.map.setPaintProperty('countries-fill', 'fill-color', p.land);
    this.map.setPaintProperty('countries-border', 'line-color', p.border);
    if (jump)
      this.map.jumpTo({
        center: [camera.lng, camera.lat],
        zoom: camera.zoom,
        bearing: camera.bearing,
        pitch: camera.pitch,
      });
    const ids = layers
      .filter((l) => l.type === 'route' || l.type === 'countryHighlight')
      .map((l) => l.id);
    for (const id of this.layerIds.filter((id) => !ids.includes(id))) {
      for (const suffix of ['fill', 'line'])
        if (this.map.getLayer(`${id}-${suffix}`))
          this.map.removeLayer(`${id}-${suffix}`);
      if (this.map.getSource(id)) this.map.removeSource(id);
    }
    this.layerIds = ids;
    const dim = layers.reduce(
      (max, l) =>
        l.type === 'countryHighlight' && l.visible
          ? Math.max(max, l.style.dimOutside * l.opacity)
          : max,
      0,
    );
    this.map.setPaintProperty('countries-fill', 'fill-opacity', 1 - dim);
    for (const layer of layers) {
      const opacity = layer.visible ? layer.opacity : 0;
      if (layer.type === 'countryHighlight') {
        if (!this.map.getLayer(`${layer.id}-fill`)) {
          this.map.addLayer({
            id: `${layer.id}-fill`,
            type: 'fill',
            source: 'countries',
            paint: { 'fill-color': layer.style.color },
          });
          this.map.addLayer({
            id: `${layer.id}-line`,
            type: 'line',
            source: 'countries',
            paint: { 'line-color': layer.style.stroke },
          });
        }
        const filter: maplibregl.FilterSpecification = [
          'in',
          ['get', 'code'],
          ['literal', layer.countryCodes],
        ];
        for (const suffix of ['fill', 'line'])
          this.map.setFilter(`${layer.id}-${suffix}`, filter);
        this.map.setPaintProperty(
          `${layer.id}-fill`,
          'fill-color',
          layer.style.color,
        );
        this.map.setPaintProperty(`${layer.id}-fill`, 'fill-opacity', opacity);
        this.map.setPaintProperty(
          `${layer.id}-line`,
          'line-color',
          layer.style.stroke,
        );
        this.map.setPaintProperty(
          `${layer.id}-line`,
          'line-width',
          layer.style.width,
        );
        this.map.setPaintProperty(`${layer.id}-line`, 'line-opacity', opacity);
      }
      if (layer.type === 'route') {
        const data: FeatureCollection = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: layer.coordinates },
            },
          ],
        };
        if (!this.map.getSource(layer.id)) {
          this.map.addSource(layer.id, { type: 'geojson', data });
          this.map.addLayer({
            id: `${layer.id}-line`,
            type: 'line',
            source: layer.id,
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': layer.style.color },
          });
        } else (this.map.getSource(layer.id) as GeoJSONSource).setData(data);
        this.map.setPaintProperty(
          `${layer.id}-line`,
          'line-color',
          layer.style.color,
        );
        this.map.setPaintProperty(
          `${layer.id}-line`,
          'line-width',
          (layer.style.width * this.map.getContainer().clientWidth) /
            project.canvas.width,
        );
        this.map.setPaintProperty(`${layer.id}-line`, 'line-opacity', opacity);
        this.map.setPaintProperty(
          `${layer.id}-line`,
          'line-dasharray',
          layer.style.dash ? [3, 2] : [1, 0],
        );
      }
      if (layer.type === 'route' || layer.type === 'countryHighlight')
        for (const suffix of ['fill', 'line'])
          if (this.map.getLayer(`${layer.id}-${suffix}`))
            this.map.moveLayer(`${layer.id}-${suffix}`);
    }
    this.drawOverlays();
  }
  private drawOverlays() {
    if (!this.project) return;
    const container = this.map.getContainer();
    const scale = container.clientWidth / this.project.canvas.width;
    this.overlays.replaceChildren();
    for (const layer of this.layers) {
      if (layer.type === 'route' && layer.visible && layer.style.arrow) {
        const end = layer.coordinates.at(-1)!, previous = layer.coordinates.at(-2)!;
        if (end[0] !== previous[0] || end[1] !== previous[1]) {
          const a = this.map.project(previous), b = this.map.project(end);
          const arrow = document.createElement('div'); arrow.textContent = '▶'; arrow.dataset.layerId = layer.id;
          arrow.addEventListener('click', (event) => { event.stopPropagation(); this.onLayer?.(layer.id); });
          Object.assign(arrow.style, { position: 'absolute', left: `${b.x}px`, top: `${b.y}px`, fontSize: `${20*scale}px`, color: layer.style.color, opacity: `${layer.opacity}`, transform: `translate(-50%,-50%) rotate(${Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI}deg)` }); this.overlays.append(arrow);
        }
      }
      if (
        !layer.visible ||
        layer.opacity === 0 ||
        (layer.type !== 'text' && layer.type !== 'marker')
      )
        continue;
      const el = document.createElement('div');
      el.dataset.layerId = layer.id;
      el.addEventListener('click', (event) => { event.stopPropagation(); this.onLayer?.(layer.id); });
      let x: number, y: number;
      if (layer.anchor.type === 'map') {
        const [lng, lat] = layer.anchor.coordinates;
        const center = this.map.getCenter().lng;
        const point = this.map.project([
          lng + 360 * Math.round((center - lng) / 360),
          lat,
        ]);
        x = point.x;
        y = point.y;
      } else {
        x = layer.anchor.x * container.clientWidth;
        y = layer.anchor.y * container.clientHeight;
      }
      Object.assign(el.style, {
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        opacity: `${layer.opacity}`,
        color: layer.style.color,
        transform: `translate(${layer.transform.offsetX * scale}px, ${layer.transform.offsetY * scale}px) rotate(${layer.transform.rotation}deg) scale(${layer.transform.scale})`,
        whiteSpace: 'pre-wrap',
      });
      if (layer.type === 'text') {
        el.textContent = layer.text;
        Object.assign(el.style, {
          fontSize: `${layer.style.fontSize * scale}px`,
          fontWeight: layer.style.fontWeight,
          textAlign: layer.style.align,
          lineHeight: '1.25',
          textShadow: '0 2px 8px #0008',
        });
      } else {
        const pin = document.createElement('span');
        pin.textContent = layer.style.icon === 'plane' ? '✈' : '●';
        pin.style.fontSize = `${layer.style.size * scale}px`;
        pin.style.display = 'block';
        pin.style.textAlign = 'center';
        const label = document.createElement('span');
        label.textContent = layer.label;
        label.style.fontSize = `${22 * scale}px`;
        label.style.textShadow = '0 1px 4px #000';
        el.append(pin, label);
        el.style.translate = '-50% -50%';
      }
      this.overlays.append(el);
    }
    const credit = document.createElement('div');
    credit.className = 'map-credit';
    credit.textContent = 'Natural Earth · Public domain';
    credit.style.fontSize = `${Math.max(8, 16 * scale)}px`;
    this.overlays.append(credit);
  }
  destroy() {
    this.overlays.remove();
    this.map.remove();
  }
}
