import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, StyleSpecification } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
maplibregl.setWorkerUrl(workerUrl);
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type {
  Camera,
  Project,
  CaptionCue,
  Anchor,
} from '@animatemap/project-schema';
import { drawCaptions } from './captions';
import { TerrainAdapter } from './terrainAdapter';
import {
  admin1CountriesForRegions,
  ADMIN1_RELEASE,
  TERRAIN_CREDIT,
  terrainCameraSupported,
} from '@animatemap/project-schema';
import { ImageResources } from './images';
import { Admin1Resources } from './admin1Resources';
import { dataLegend } from './dataLegend';
import {
  wrap,
  hiddenLabels,
  transformLabelBounds,
  type LabelCandidate,
  type RenderLayer,
  type SceneBlend,
  type AEAnchorSample,
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
async function resourceReady<T>(
  operation: Promise<T>,
  label: string,
  timeoutMs: number,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} resources timed out`)),
          timeoutMs,
        );
      }),
    ]);
  } catch (error) {
    throw new Error(
      `${label} resources failed: ${error instanceof Error ? error.message : 'unknown resource error'}`,
    );
  } finally {
    clearTimeout(timer);
  }
}
export function makeStyle(
  style: Project['map']['styleId'],
  countries: Countries,
): StyleSpecification {
  const p = palettes[style];
  return {
    version: 8,
    transition: { duration: 0, delay: 0 },
    sources: {
      countries: { type: 'geojson', data: countries },
      admin1: {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      },
    },
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
      {
        id: 'admin1-select',
        type: 'fill',
        source: 'admin1',
        filter: ['==', ['get', 'countryCode'], ''],
        paint: { 'fill-color': p.land, 'fill-opacity': 0 },
      },
      {
        id: 'admin1-border',
        type: 'line',
        source: 'admin1',
        filter: ['==', ['get', 'countryCode'], ''],
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
  private captionHost = document.createElement('div');
  private captions: CaptionCue[] = [];
  readonly map: maplibregl.Map;
  private terrain: TerrainAdapter;
  private vectorOrderSignature = '';
  private geometrySignatures = new Map<string, string>();
  private geometryTypes = new Map<string, RenderLayer['type']>();
  private overlays: HTMLDivElement;
  private layerIds: string[] = [];
  private project?: Project;
  private layers: RenderLayer[] = [];
  private error?: string;
  private destroyed = false;
  private blend?: SceneBlend;
  private outgoing?: MapRenderer;
  private outgoingHost?: HTMLDivElement;
  private admin1Signature = '';
  private admin1 = new Admin1Resources(
    () => {
      if (!this.destroyed && this.project && !this.error)
        this.apply(
          this.project,
          readCamera(this.map, this.project.canvas.width),
          this.layers,
          false,
          this.blend,
        );
    },
    (error) => {
      this.error = error.message;
      this.onFailure?.(error);
    },
  );
  private images = new ImageResources(
    () => {
      if (!this.destroyed && this.project && !this.error)
        this.apply(
          this.project,
          readCamera(this.map, this.project.canvas.width),
          this.layers,
          false,
          this.blend,
        );
    },
    (error) => {
      this.error = error.message;
      this.onFailure?.(error);
    },
  );
  private patternImages = new Map<string, { dataUrl: string; ratio: number }>();
  private textContext = document.createElement('canvas').getContext('2d')!;
  private fontsReady = false;
  private measurements = new Map<string, { width: number; height: number }>();
  constructor(
    container: HTMLElement,
    readonly countries: Countries,
    camera: Camera,
    onCountry?: (code: string) => void,
    onCamera?: (camera: Camera) => void,
    private onPoint?: (point: [number, number]) => void,
    private onLayer?: (id: string) => void,
    private onFailure?: (error: Error) => void,
    private onRegion?: (code: string) => void,
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
    this.terrain = new TerrainAdapter(this.map);
    this.overlays = document.createElement('div');
    this.overlays.className = 'map-overlays';
    container.append(this.overlays);
    Object.assign(this.captionHost.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '4',
    });
    container.append(this.captionHost);
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
      const region = this.map
        .queryRenderedFeatures(e.point)
        .find(
          (feature) => feature.source === 'admin1' && feature.properties?.code,
        );
      if (region) this.onRegion?.(String(region.properties.code));
      else if (f?.properties?.code) onCountry?.(String(f.properties.code));
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
    await resourceReady(this.admin1.ready(), 'Admin 1', timeoutMs);
    await resourceReady(this.images.ready(), 'Image', timeoutMs);
    await resourceReady(
      Promise.all(
        [400, 700].map(async (weight) => {
          const faces = await document.fonts.load(
            `${weight} 16px "Noto Sans"`,
            'AnimateMap Việt Nam',
          );
          if (!faces.length || faces.some((face) => face.status !== 'loaded'))
            throw new Error(`Noto Sans ${weight} font resources unavailable`);
        }),
      ),
      'Font',
      timeoutMs,
    );
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
    if (!this.fontsReady) {
      this.fontsReady = true;
      this.measurements.clear();
      this.drawOverlays();
    }
    // Cloned image elements must also finish decoding before a screenshot.
    await resourceReady(
      Promise.all(
        Array.from(this.overlays.querySelectorAll('img')).map((image) =>
          image.decode(),
        ),
      ),
      'Image overlay',
      timeoutMs,
    );
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
    if (this.project?.map.terrain) {
      this.drawOverlays();
      await resourceReady(
        Promise.all(
          Array.from(this.overlays.querySelectorAll('img')).map((image) =>
            image.decode(),
          ),
        ),
        'Terrain image overlays',
        timeoutMs,
      );
    }
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
    captions: CaptionCue[] = this.captions,
  ) {
    if (this.error) throw new Error(this.error);
    this.project = project;
    this.layers = layers;
    this.blend = blend;
    this.captions = captions;
    if (!this.map.getLayer('countries-fill')) return;
    if (project.map.terrain && !terrainCameraSupported(camera))
      throw new Error(
        'Terrain preview is outside the verified Sa Pa pack; return to the supported region at zoom 10 or greater',
      );
    this.terrain.use(project.map.terrain);
    const regionCountries = [
      ...new Set([
        ...project.map.admin1Countries,
        ...layers.flatMap((layer) =>
          layer.type === 'admin1Highlight' && layer.visible && layer.opacity > 0
            ? admin1CountriesForRegions(layer.regionCodes)
            : [],
        ),
      ]),
    ].sort();
    this.admin1.use(regionCountries);
    const regionSignature = regionCountries
      .map(
        (country) =>
          `${country}:${this.admin1.get(country)?.features.length ?? 0}`,
      )
      .join('|');
    if (regionSignature !== this.admin1Signature) {
      (this.map.getSource('admin1') as GeoJSONSource).setData(
        this.admin1.collection(regionCountries),
      );
      this.admin1Signature = regionSignature;
    }
    const regionFilter: maplibregl.FilterSpecification = [
      'in',
      ['get', 'countryCode'],
      ['literal', project.map.admin1Countries],
    ];
    this.map.setFilter('admin1-select', regionFilter);
    this.map.setFilter('admin1-border', regionFilter);
    const references = new Set(
      layers.flatMap((layer) => {
        if (!layer.visible || layer.opacity === 0) return [];
        return layer.type === 'image'
          ? [layer.assetId]
          : layer.type === 'countryHighlight' && layer.textureAssetId
            ? [layer.textureAssetId]
            : [];
      }),
    );
    this.images.use(project.assets.filter((asset) => references.has(asset.id)));
    const ratio = project.canvas.width / this.map.getContainer().clientWidth;
    for (const [id, applied] of this.patternImages) {
      const asset = project.assets.find((asset) => asset.id === id);
      if (
        !references.has(id) ||
        applied.ratio !== ratio ||
        applied.dataUrl !== asset?.dataUrl
      ) {
        for (const layerId of this.layerIds)
          if (this.map.getLayer(`ams-${layerId}-fill`))
            this.map.setPaintProperty(
              `ams-${layerId}-fill`,
              'fill-pattern',
              undefined,
            );
        this.map.removeImage(`ams-image-${id}`);
        this.patternImages.delete(id);
      }
    }
    for (const layer of layers) {
      if (
        layer.type !== 'countryHighlight' ||
        !layer.textureAssetId ||
        !references.has(layer.textureAssetId)
      )
        continue;
      const asset = project.assets.find(
        (asset) => asset.id === layer.textureAssetId,
      )!;
      const image = this.images.get(asset.id);
      if (image && !this.patternImages.has(asset.id)) {
        this.map.addImage(`ams-image-${asset.id}`, image, {
          pixelRatio: ratio,
        });
        this.patternImages.set(asset.id, { dataUrl: asset.dataUrl, ratio });
      }
    }
    const p = palettes[project.map.styleId];
    this.map.setPaintProperty('ocean', 'background-color', p.ocean);
    this.map.setPaintProperty('countries-fill', 'fill-color', p.land);
    this.map.setPaintProperty('countries-border', 'line-color', p.border);
    this.map.setPaintProperty('admin1-border', 'line-color', p.border);
    this.map.setPaintProperty(
      'admin1-border',
      'line-width',
      (0.7 * this.map.getContainer().clientWidth) / project.canvas.width,
    );
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
          l.type === 'choropleth' ||
          l.type === 'admin1Highlight' ||
          l.type === 'countryHighlight',
      )
      .map((l) => l.id);
    for (const id of this.layerIds.filter(
      (id) =>
        !ids.includes(id) ||
        this.geometryTypes.get(id) !==
          layers.find((layer) => layer.id === id)?.type,
    )) {
      for (const suffix of ['fill', 'line'])
        if (this.map.getLayer(`ams-${id}-${suffix}`))
          this.map.removeLayer(`ams-${id}-${suffix}`);
      if (this.map.getSource(`ams-${id}`)) this.map.removeSource(`ams-${id}`);
      this.geometrySignatures.delete(id);
      this.geometryTypes.delete(id);
      this.vectorOrderSignature = '';
    }
    this.layerIds = ids;
    for (const layer of layers)
      if (ids.includes(layer.id)) this.geometryTypes.set(layer.id, layer.type);
    const dim = layers.reduce(
      (max, l) =>
        (l.type === 'countryHighlight' || l.type === 'admin1Highlight') &&
        l.visible
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
      if (layer.type === 'admin1Highlight') {
        if (!this.map.getLayer(`ams-${layer.id}-fill`)) {
          this.map.addLayer({
            id: `ams-${layer.id}-fill`,
            type: 'fill',
            source: 'admin1',
          });
          this.map.addLayer({
            id: `ams-${layer.id}-line`,
            type: 'line',
            source: 'admin1',
          });
        }
        const filter: maplibregl.FilterSpecification = [
          'in',
          ['get', 'code'],
          ['literal', layer.regionCodes],
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
          'line-opacity',
          opacity,
        );
        this.map.setPaintProperty(
          `ams-${layer.id}-line`,
          'line-width',
          (layer.style.width * this.map.getContainer().clientWidth) /
            project.canvas.width,
        );
      }
      if (layer.type === 'choropleth') {
        const dataset = project.datasets.find(
          (dataset) => dataset.id === layer.datasetId,
        )!;
        const codes = [
          ...new Set(dataset.records.map((record) => record.countryCode)),
        ];
        const unknown = codes.find(
          (code) =>
            !this.countries.features.some(
              (feature) => feature.properties.code === code,
            ),
        );
        if (unknown)
          throw new Error(`Country ${unknown} is not in the bundled dataset`);
        if (!this.map.getLayer(`ams-${layer.id}-fill`)) {
          this.map.addLayer({
            id: `ams-${layer.id}-fill`,
            type: 'fill',
            source: 'countries',
          });
          this.map.addLayer({
            id: `ams-${layer.id}-line`,
            type: 'line',
            source: 'countries',
          });
        }
        const filter: maplibregl.FilterSpecification = [
          'in',
          ['get', 'code'],
          ['literal', codes],
        ];
        for (const suffix of ['fill', 'line'])
          this.map.setFilter(`ams-${layer.id}-${suffix}`, filter);
        const [first, ...remaining] = Object.entries(layer.data?.colors ?? {});
        const expression: maplibregl.ExpressionSpecification | string = first
          ? [
              'match',
              ['get', 'code'],
              first[0],
              first[1],
              ...remaining.flatMap(([code, color]) => [code, color]),
              layer.style.missingColor,
            ]
          : layer.style.missingColor;
        this.map.setPaintProperty(
          `ams-${layer.id}-fill`,
          'fill-color',
          expression,
        );
        this.map.setPaintProperty(
          `ams-${layer.id}-fill`,
          'fill-pattern',
          undefined,
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
          'line-opacity',
          opacity,
        );
        this.map.setPaintProperty(
          `ams-${layer.id}-line`,
          'line-width',
          (layer.style.width * this.map.getContainer().clientWidth) /
            project.canvas.width,
        );
      }
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
          `ams-${layer.id}-fill`,
          'fill-pattern',
          layer.textureAssetId && this.patternImages.has(layer.textureAssetId)
            ? `ams-image-${layer.textureAssetId}`
            : undefined,
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
        const signature = JSON.stringify(
          layer.renderCoordinates ?? layer.coordinates,
        );
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
          this.geometrySignatures.set(layer.id, signature);
        } else if (this.geometrySignatures.get(layer.id) !== signature) {
          (this.map.getSource(`ams-${layer.id}`) as GeoJSONSource).setData(
            data,
          );
          this.geometrySignatures.set(layer.id, signature);
        }
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
    }
    // Moving identical layers each frame invalidates terrain render-to-texture stacks.
    const ordered = layers.flatMap((layer) => {
      if (
        layer.type === 'route' ||
        layer.type === 'shape' ||
        layer.type === 'choropleth' ||
        layer.type === 'admin1Highlight' ||
        layer.type === 'countryHighlight'
      )
        return ['fill', 'line']
          .map((suffix) => `ams-${layer.id}-${suffix}`)
          .filter((id) => !!this.map.getLayer(id));
      return [];
    });
    if (project.map.terrain) ordered.push('ams-terrain-shade');
    const orderSignature = JSON.stringify(ordered);
    if (orderSignature !== this.vectorOrderSignature) {
      for (const id of ordered) this.map.moveLayer(id);
      this.vectorOrderSignature = orderSignature;
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
  private measureLabel(
    text: string,
    size: number,
    weight: string,
    lineHeight?: number,
  ) {
    const key = JSON.stringify([text, size, weight, lineHeight]);
    const cached = this.measurements.get(key);
    if (cached) return cached;
    this.textContext.font = `${weight} ${size}px "Noto Sans"`;
    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    const tabWidth = this.textContext.measureText(' ').width * 8;
    const widths = lines.map((line) => {
      let width = 0;
      for (const [index, part] of line.split('\t').entries()) {
        if (index) width = (Math.floor(width / tabWidth) + 1) * tabWidth;
        width += this.textContext.measureText(part).width;
      }
      return width;
    });
    const metrics = this.textContext.measureText('Việt Nam');
    const measurement = {
      width: Math.max(...widths),
      height:
        lines.length *
        (lineHeight ??
          metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent),
    };
    if (this.measurements.size >= 100)
      this.measurements.delete(this.measurements.keys().next().value!);
    this.measurements.set(key, measurement);
    return measurement;
  }
  private drawOverlays() {
    if (!this.project) return;
    drawCaptions(this.captionHost, this.project, this.captions);
    const container = this.map.getContainer();
    const scale = container.clientWidth / this.project.canvas.width;
    if (!scale) return;
    const labels: { candidate: LabelCandidate; element: HTMLElement }[] = [];
    this.overlays.replaceChildren();
    for (const layer of this.layers) {
      if (
        layer.type === 'choropleth' &&
        layer.visible &&
        layer.opacity > 0 &&
        layer.legend.visible &&
        layer.data
      ) {
        const dataset = this.project.datasets.find(
          (dataset) => dataset.id === layer.datasetId,
        )!;
        const legend = dataLegend(
          dataset,
          layer,
          layer.data,
          scale,
          container.clientWidth,
          container.clientHeight,
        );
        legend.addEventListener('click', (event) => {
          event.stopPropagation();
          this.onLayer?.(layer.id);
        });
        this.overlays.append(legend);
      }
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
        (layer.type !== 'text' &&
          layer.type !== 'marker' &&
          layer.type !== 'image')
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
            ((event.clientX - box.left) * this.map.getContainer().clientWidth) /
              box.width,
            ((event.clientY - box.top) * this.map.getContainer().clientHeight) /
              box.height,
          ]);
          this.onPoint?.([wrap(point.lng), point.lat]);
        }
      });
      const { x, y } = this.projectAnchor(layer.anchor);
      Object.assign(el.style, {
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        opacity: `${layer.opacity}`,
        color: layer.type === 'image' ? undefined : layer.style.color,
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
          width: 'max-content',
        });
        if (layer.text.trim()) {
          const measured = this.measureLabel(
            layer.text,
            layer.style.fontSize,
            layer.style.fontWeight,
            layer.style.fontSize * 1.25,
          );
          const bounds = { x: x / scale, y: y / scale, ...measured };
          const origin = {
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2,
          };
          el.style.transformOrigin = `${(measured.width * scale) / 2}px ${(measured.height * scale) / 2}px`;
          labels.push({
            element: el,
            candidate: {
              id: layer.id,
              ...layer.collision,
              order: this.layers.indexOf(layer),
              bounds: transformLabelBounds(bounds, origin, layer.transform),
            },
          });
        }
      } else if (layer.type === 'image') {
        const decoded = this.images.get(layer.assetId);
        if (!decoded) continue;
        const image = decoded.cloneNode() as HTMLImageElement;
        image.alt = layer.name;
        image.draggable = false;
        Object.assign(image.style, {
          width: `${layer.style.width * scale}px`,
          height: `${layer.style.height * scale}px`,
          objectFit: layer.style.fit,
          display: 'block',
        });
        el.append(image);
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
        if (layer.label.trim()) {
          const measured = this.measureLabel(layer.label, 22, 'normal');
          // Marker containers have no flow content: their CSS transform origin is the anchor.
          const bounds = {
            x: x / scale - measured.width / 2,
            y: y / scale + layer.style.size / 2,
            ...measured,
          };
          labels.push({
            element: label,
            candidate: {
              id: layer.id,
              ...layer.collision,
              order: this.layers.indexOf(layer),
              bounds: transformLabelBounds(
                bounds,
                { x: x / scale, y: y / scale },
                layer.transform,
              ),
            },
          });
        }
      }
      this.overlays.append(el);
    }
    const hidden = hiddenLabels(
      labels.map((label) => label.candidate),
      {
        x: 0,
        y: 0,
        width: this.project.canvas.width,
        height: container.clientHeight / scale,
      },
    );
    for (const label of labels) {
      const isHidden = hidden.has(label.candidate.id);
      label.element.dataset.labelId = label.candidate.id;
      label.element.dataset.labelHidden = String(isHidden);
      label.element.style.visibility = isHidden ? 'hidden' : 'visible';
    }
    const credit = document.createElement('div');
    credit.className = 'map-credit';
    const credits = new Set<string>();
    if (this.project.map.terrain)
      credits.add(`${TERRAIN_CREDIT} · Sa Pa coverage`);
    for (const asset of this.project.audioAssets)
      if (
        this.project.audioTracks.some(
          (track) => track.assetId === asset.id && !track.muted,
        )
      )
        credits.add(asset.provenance.credit);
    if (
      this.project.map.admin1Countries.length ||
      this.layers.some(
        (layer) =>
          layer.type === 'admin1Highlight' &&
          layer.visible &&
          layer.opacity > 0,
      )
    )
      credits.add(`Natural Earth Admin 1 · v${ADMIN1_RELEASE}`);
    for (const layer of this.layers) {
      if (!layer.visible || layer.opacity === 0) continue;
      if (
        (layer.type === 'route' || layer.type === 'marker') &&
        layer.geographySource
      )
        credits.add(layer.geographySource.credit);
      if (layer.type === 'choropleth') {
        const dataset = this.project.datasets.find(
          (dataset) => dataset.id === layer.datasetId,
        );
        if (dataset) credits.add(dataset.provenance.credit);
      }
      const reference =
        layer.type === 'image'
          ? layer.assetId
          : layer.type === 'countryHighlight'
            ? layer.textureAssetId
            : undefined;
      const asset = this.project.assets.find((asset) => asset.id === reference);
      if (asset) credits.add(asset.provenance.credit);
    }
    credit.textContent = ['Natural Earth · Public domain', ...credits].join(
      ' · ',
    );
    credit.style.maxWidth = '90%';
    credit.style.fontSize = `${16 * scale}px`;
    this.overlays.append(credit);
  }
  /** Read-only full-project-pixel attachment samples from the same overlay projection. */
  private projectAnchor(anchor: Anchor) {
    if (anchor.type === 'map') {
      const [lng, lat] = anchor.coordinates;
      return this.map.project([
        lng + 360 * Math.round((this.map.getCenter().lng - lng) / 360),
        lat,
      ]);
    }
    const container = this.map.getContainer();
    return {
      x: anchor.x * container.clientWidth,
      y: anchor.y * container.clientHeight,
    };
  }
  anchorSamples(weight = 1): AEAnchorSample[] {
    if (!this.project || this.destroyed)
      throw new Error('Renderer not initialized');
    const scale =
      this.map.getContainer().clientWidth / this.project.canvas.width;
    const elements = new Map(
      Array.from(this.overlays.children)
        .filter((el): el is HTMLElement => el instanceof HTMLElement)
        .map((el) => [el.dataset.layerId, el]),
    );
    const samples = this.layers.flatMap((layer): AEAnchorSample[] => {
      if (
        layer.type !== 'marker' &&
        layer.type !== 'text' &&
        layer.type !== 'image'
      )
        return [];
      const element = elements.get(layer.id);
      const hidden =
        element?.dataset.labelHidden === 'true' ||
        !!element?.querySelector('[data-label-hidden="true"]');
      const point = this.projectAnchor(layer.anchor),
        x = point.x / scale,
        y = point.y / scale;
      return [
        {
          id: layer.id,
          position: [x + layer.transform.offsetX, y + layer.transform.offsetY],
          scale: layer.transform.scale,
          rotation: layer.transform.rotation,
          opacity:
            layer.visible && !(layer.type === 'text' && hidden)
              ? layer.opacity * weight
              : 0,
          labelHidden: hidden,
        },
      ];
    });
    if (this.blend && this.outgoing) {
      const incoming = this.blend.incomingWeight;
      return [
        ...samples.map((s) => ({ ...s, opacity: s.opacity * incoming })),
        ...this.outgoing.anchorSamples(weight * (1 - incoming)),
      ];
    }
    return samples;
  }
  destroy() {
    this.destroyed = true;
    this.admin1.destroy();
    this.images.dispose();
    this.outgoing?.destroy();
    this.outgoingHost?.remove();
    this.overlays.remove();
    this.captionHost.remove();
    this.map.remove();
  }
  regionsForCountry(country: string) {
    return this.admin1.get(country);
  }
}
