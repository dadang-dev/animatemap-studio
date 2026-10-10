import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, StyleSpecification } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
maplibregl.setWorkerUrl(workerUrl);
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { Camera, Project } from '@animatemap/project-schema';
import {
  wrap,
  type RenderLayer,
  type SceneBlend,
} from '@animatemap/animation-core';
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
    transition: { duration: 0, delay: 0 },
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
export function readCamera(
  map: maplibregl.Map,
  canvasWidth = map.getContainer().clientWidth,
): Camera {
  const c = map.getCenter();
  return {
    lng: wrap(c.lng),
    lat: c.lat,
    zoom: Math.max(
      0,
      Math.min(
        18,
        map.getZoom() - Math.log2(map.getContainer().clientWidth / canvasWidth),
      ),
    ),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  };
}
export class MapRenderer {
  readonly map: maplibregl.Map;
  private overlays: HTMLDivElement;
  private layerIds: string[] = [];
  private project?: Project;
  private layers: RenderLayer[] = [];
  private error?: string;
  private destroyed = false;
  private blend?: SceneBlend;
  private outgoing?: MapRenderer;
  private outgoingHost?: HTMLDivElement;
  constructor(
    container: HTMLElement,
    readonly countries: Countries,
    camera: Camera,
    onCountry?: (code: string) => void,
    onCamera?: (camera: Camera) => void,
    private onPoint?: (point: [number, number]) => void,
    private onLayer?: (id: string) => void,
    private onFailure?: (error: Error) => void,
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
      minZoom: -4,
      attributionControl: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
      fadeDuration: 0,
    });
    this.overlays = document.createElement('div');
    this.overlays.className = 'map-overlays';
    container.append(this.overlays);
    this.map.on('error', (e) => {
      if (this.destroyed) return;
      this.error = e.error.message;
      this.onFailure?.(new Error(this.error));
    });
    this.map.getCanvas().addEventListener('webglcontextlost', () => {
      if (this.destroyed) return;
      this.error = 'WebGL context lost. Reload to restore the map.';
      this.onFailure?.(new Error(this.error));
    });
    this.map.on('move', () => this.drawOverlays());
    this.map.on('moveend', (e) => {
      if (e.originalEvent)
        onCamera?.(readCamera(this.map, this.project?.canvas.width));
    });
    this.map.on('click', (e) => {
      const f = this.map.queryRenderedFeatures(e.point, {
        layers: ['countries-fill'],
      })[0];
      if (f?.properties?.code) onCountry?.(String(f.properties.code));
      const hit = this.map
        .queryRenderedFeatures(e.point)
        .find((feature) =>
          this.layerIds.some(
            (id) =>
              feature.layer.id === `ams-${id}-line` ||
              feature.layer.id === `ams-${id}-fill`,
          ),
        );
      if (hit) {
        const id = this.layerIds.find(
          (id) =>
            hit.layer.id === `ams-${id}-line` ||
            hit.layer.id === `ams-${id}-fill`,
        );
        if (id) this.onLayer?.(id);
      }
      onPoint?.([wrap(e.lngLat.lng), e.lngLat.lat]);
    });
  }
  async ready(timeoutMs = 15000) {
    if (this.destroyed) throw new Error('Renderer disposed');
    if (this.error) throw new Error(this.error);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Font resources timed out')),
        timeoutMs,
      );
      void document.fonts.ready.then(
        () => {
          clearTimeout(timer);
          resolve();
        },
        (error: unknown) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });
    const start = performance.now();
    await new Promise<void>((resolve, reject) => {
      const check = () => {
        if (this.destroyed) return reject(new Error('Renderer disposed'));
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
    if (this.outgoing && this.blend && this.project) {
      await this.outgoing.ready(timeoutMs);
      this.outgoing.apply(
        this.project,
        this.blend.outgoing.camera,
        this.blend.outgoing.layers,
      );
      await this.outgoing.ready(timeoutMs);
    }
  }
  apply(
    project: Project,
    camera: Camera,
    layers: RenderLayer[],
    jump = true,
    blend?: SceneBlend,
  ) {
    if (this.error) throw new Error(this.error);
    this.project = project;
    this.layers = layers;
    this.blend = blend;
    if (!this.map.getLayer('countries-fill')) return;
    const p = palettes[project.map.styleId];
    this.map.setPaintProperty('ocean', 'background-color', p.ocean);
    this.map.setPaintProperty('countries-fill', 'fill-color', p.land);
    this.map.setPaintProperty('countries-border', 'line-color', p.border);
    this.map.setPaintProperty(
      'countries-border',
      'line-width',
      (0.7 * this.map.getContainer().clientWidth) / project.canvas.width,
    );
    if (jump)
      this.map.jumpTo({
        center: [camera.lng, camera.lat],
        zoom:
          camera.zoom +
          Math.log2(this.map.getContainer().clientWidth / project.canvas.width),
        bearing: camera.bearing,
        pitch: camera.pitch,
      });
    const ids = layers
      .filter(
        (l) =>
          l.type === 'route' ||
          l.type === 'shape' ||
          l.type === 'countryHighlight',
      )
      .map((l) => l.id);
    for (const id of this.layerIds.filter((id) => !ids.includes(id))) {
      for (const suffix of ['fill', 'line'])
        if (this.map.getLayer(`ams-${id}-${suffix}`))
          this.map.removeLayer(`ams-${id}-${suffix}`);
      if (this.map.getSource(`ams-${id}`)) this.map.removeSource(`ams-${id}`);
    }
    this.layerIds = ids;
    const dim = layers.reduce(
      (max, l) =>
        l.type === 'countryHighlight' && l.visible
          ? Math.max(max, l.style.dimOutside * l.opacity)
          : max,
      0,
    );
    const darken = (hex: string) =>
      '#' +
      [1, 3, 5]
        .map((start) =>
          Math.round(parseInt(hex.slice(start, start + 2), 16) * (1 - dim))
            .toString(16)
            .padStart(2, '0'),
        )
        .join('');
    this.map.setPaintProperty('ocean', 'background-color', darken(p.ocean));
    this.map.setPaintProperty('countries-fill', 'fill-color', darken(p.land));
    this.map.setPaintProperty('countries-fill', 'fill-opacity', 1);
    for (const layer of layers) {
      const opacity = layer.visible ? layer.opacity : 0;
      if (layer.type === 'countryHighlight') {
        const unknown = layer.countryCodes.find(
          (code) =>
            !this.countries.features.some((f) => f.properties.code === code),
        );
        if (unknown)
          throw new Error(`Country ${unknown} is not in the bundled dataset`);
        if (!this.map.getLayer(`ams-${layer.id}-fill`)) {
          this.map.addLayer({
            id: `ams-${layer.id}-fill`,
            type: 'fill',
            source: 'countries',
            paint: { 'fill-color': layer.style.color },
          });
          this.map.addLayer({
            id: `ams-${layer.id}-line`,
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
          this.map.setFilter(`ams-${layer.id}-${suffix}`, filter);
        this.map.setPaintProperty(
          `ams-${layer.id}-fill`,
          'fill-color',
          layer.style.color,
        );
        this.map.setPaintProperty(
          `ams-${layer.id}-fill`,
          'fill-opacity',
          opacity,
        );
        this.map.setPaintProperty(
          `ams-${layer.id}-line`,
          'line-color',
          layer.style.stroke,
        );
        this.map.setPaintProperty(
          `ams-${layer.id}-line`,
          'line-width',
          (layer.style.width * this.map.getContainer().clientWidth) /
            project.canvas.width,
        );
        this.map.setPaintProperty(
          `ams-${layer.id}-line`,
          'line-opacity',
          opacity,
        );
      }
      if (layer.type === 'route' || layer.type === 'shape') {
        const data: FeatureCollection = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: layer.renderCoordinates ?? layer.coordinates,
              },
            },
          ],
        };
        if (!this.map.getSource(`ams-${layer.id}`)) {
          this.map.addSource(`ams-${layer.id}`, { type: 'geojson', data });
          this.map.addLayer({
            id: `ams-${layer.id}-line`,
            type: 'line',
            source: `ams-${layer.id}`,
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': layer.style.color },
          });
        } else
          (this.map.getSource(`ams-${layer.id}`) as GeoJSONSource).setData(
            data,
          );
        this.map.setPaintProperty(
          `ams-${layer.id}-line`,
          'line-color',
          layer.style.color,
        );
        this.map.setPaintProperty(
          `ams-${layer.id}-line`,
          'line-width',
          (layer.style.width * this.map.getContainer().clientWidth) /
            project.canvas.width,
        );
        this.map.setPaintProperty(
          `ams-${layer.id}-line`,
          'line-opacity',
          opacity,
        );
        this.map.setPaintProperty(
          `ams-${layer.id}-line`,
          'line-dasharray',
          layer.style.dash ? [3, 2] : [1, 0],
        );
      }
      if (
        layer.type === 'route' ||
        layer.type === 'shape' ||
        layer.type === 'countryHighlight'
      )
        for (const suffix of ['fill', 'line'])
          if (this.map.getLayer(`ams-${layer.id}-${suffix}`))
            this.map.moveLayer(`ams-${layer.id}-${suffix}`);
    }
    this.drawOverlays();
    this.applyBlend();
  }
  private applyBlend() {
    if (!this.blend || !this.project) {
      this.outgoing?.destroy();
      this.outgoing = undefined;
      this.outgoingHost?.remove();
      this.outgoingHost = undefined;
      return;
    }
    if (!this.outgoing) {
      const host = document.createElement('div');
      host.dataset.crossfade = 'outgoing';
      host.inert = true;
      Object.assign(host.style, {
        position: 'absolute',
        inset: '0',
        pointerEvents: 'none',
      });
      this.map.getContainer().append(host);
      this.outgoingHost = host;
      this.outgoing = new MapRenderer(
        host,
        this.countries,
        this.blend.outgoing.camera,
        undefined,
        undefined,
        undefined,
        undefined,
        (error) => {
          this.error = error.message;
          this.onFailure?.(error);
        },
      );
      // Newly created sources must receive their state after style readiness.
      const outgoing = this.outgoing;
      void outgoing
        .ready()
        .then(() => {
          if (
            !this.destroyed &&
            this.blend &&
            this.project &&
            this.outgoing === outgoing
          )
            outgoing.apply(
              this.project,
              this.blend.outgoing.camera,
              this.blend.outgoing.layers,
            );
        })
        .catch((error: unknown) => {
          if (!this.destroyed && this.outgoing === outgoing) {
            this.error =
              error instanceof Error ? error.message : 'Crossfade map failed';
            this.onFailure?.(new Error(this.error));
          }
        });
    }
    this.outgoingHost!.style.opacity = `${1 - this.blend.incomingWeight}`;
    this.outgoing.map.resize();
    this.outgoing.apply(
      this.project,
      this.blend.outgoing.camera,
      this.blend.outgoing.layers,
    );
  }
  private drawOverlays() {
    if (!this.project) return;
    const container = this.map.getContainer();
    const scale = container.clientWidth / this.project.canvas.width;
    this.overlays.replaceChildren();
    for (const layer of this.layers) {
      if (
        (layer.type === 'route' || layer.type === 'shape') &&
        layer.visible &&
        (layer.style.arrow ||
          (layer.type === 'shape' && layer.kind === 'arrow'))
      ) {
        const coordinates = layer.renderCoordinates ?? layer.coordinates;
        const end = coordinates.at(-1)!,
          previous = coordinates.at(-2)!;
        if (end[0] !== previous[0] || end[1] !== previous[1]) {
          const shift =
            360 * Math.round((this.map.getCenter().lng - end[0]) / 360);
          const a = this.map.project([previous[0] + shift, previous[1]]),
            b = this.map.project([end[0] + shift, end[1]]);
          const arrow = document.createElement('div');
          arrow.textContent = '▶';
          arrow.dataset.layerId = layer.id;
          arrow.addEventListener('click', (event) => {
            event.stopPropagation();
            this.onLayer?.(layer.id);
          });
          Object.assign(arrow.style, {
            position: 'absolute',
            left: `${b.x}px`,
            top: `${b.y}px`,
            fontSize: `${20 * scale}px`,
            color: layer.style.color,
            opacity: `${layer.opacity}`,
            transform: `translate(-50%,-50%) rotate(${(Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI}deg)`,
          });
          this.overlays.append(arrow);
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
      el.addEventListener('click', (event) => {
        event.stopPropagation();
        this.onLayer?.(layer.id);
        if (layer.type === 'marker' && layer.anchor.type === 'map')
          this.onPoint?.(layer.anchor.coordinates);
        else {
          const box = this.map.getContainer().getBoundingClientRect();
          const point = this.map.unproject([
            event.clientX - box.left,
            event.clientY - box.top,
          ]);
          this.onPoint?.([wrap(point.lng), point.lat]);
        }
      });
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
          textShadow: `0 ${2 * scale}px ${8 * scale}px #0008`,
        });
      } else {
        const pin = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'svg',
        );
        pin.setAttribute('viewBox', '0 0 24 24');
        pin.setAttribute('width', `${layer.style.size * scale}`);
        pin.setAttribute('height', `${layer.style.size * scale}`);
        pin.classList.add('marker-icon');
        const shape = document.createElementNS(
          'http://www.w3.org/2000/svg',
          layer.style.icon === 'circle' ? 'circle' : 'path',
        );
        if (layer.style.icon === 'circle') {
          shape.setAttribute('cx', '12');
          shape.setAttribute('cy', '12');
          shape.setAttribute('r', '8');
        } else
          shape.setAttribute(
            'd',
            layer.style.icon === 'pin'
              ? 'M12 23C12 23 3 14 3 9A9 9 0 1 1 21 9C21 14 12 23 12 23Z'
              : 'M12 2L15 10L22 14L22 17L14 15L14 20L17 22L17 24L12 22L7 24L7 22L10 20L10 15L2 17L2 14L9 10Z',
          );
        shape.setAttribute('fill', layer.style.color);
        pin.append(shape);
        Object.assign(pin.style, {
          position: 'absolute',
          left: '0',
          top: '0',
          transform:
            layer.style.icon === 'pin'
              ? 'translate(-50%,-100%)'
              : 'translate(-50%,-50%)',
        });
        const label = document.createElement('span');
        label.textContent = layer.label;
        label.style.fontSize = `${22 * scale}px`;
        label.style.textShadow = `0 ${scale}px ${4 * scale}px #000`;
        Object.assign(label.style, {
          position: 'absolute',
          left: '0',
          top: `${(layer.style.size * scale) / 2}px`,
          transform: 'translateX(-50%)',
          whiteSpace: 'nowrap',
        });
        el.append(pin, label);
      }
      this.overlays.append(el);
    }
    const credit = document.createElement('div');
    credit.className = 'map-credit';
    credit.textContent = 'Natural Earth · Public domain';
    credit.style.fontSize = `${16 * scale}px`;
    this.overlays.append(credit);
  }
  destroy() {
    this.destroyed = true;
    this.outgoing?.destroy();
    this.outgoingHost?.remove();
    this.overlays.remove();
    this.map.remove();
  }
}
