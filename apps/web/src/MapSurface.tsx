import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MapRenderer, type Countries } from '@animatemap/map-engine';
import type { Camera, Project, CaptionCue } from '@animatemap/project-schema';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { SceneBlend, RenderLayer } from '@animatemap/animation-core';
import { EditHandles } from './EditHandles';
export function MapSurface({
  project,
  camera,
  layers = project.scenes[0]!.layers,
  blend,
  captions,
  onCountry,
  onRegion,
  onCamera,
  onPoint,
  onReady,
  onLayer,
  onError,
  editCoordinates,
  onEditPoint,
}: {
  project: Project;
  camera: Camera;
  layers?: RenderLayer[];
  editCoordinates?: [number, number][];
  onEditPoint?: (index: number) => void;
  blend?: SceneBlend;
  captions?: CaptionCue[];
  onCountry?: (code: string) => void;
  onRegion?: (code: string) => void;
  onCamera?: (camera: Camera) => void;
  onPoint?: (point: [number, number]) => void;
  onReady?: (renderer: MapRenderer) => void;
  onLayer?: (id: string) => void;
  onError?: (error: Error) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const [renderScale, setRenderScale] = useState(1);
  const native3D =
    !!project.map.terrain ||
    project.scenes.some((scene) =>
      scene.layers.some(
        (layer) => layer.type === 'buildings' || layer.type === 'model',
      ),
    );
  useLayoutEffect(() => {
    if (!native3D) return;
    const parent = surface.current?.parentElement;
    if (!parent) return;
    const resize = () =>
      setRenderScale(
        Math.min(
          parent.clientWidth / project.canvas.width,
          parent.clientHeight / project.canvas.height,
        ),
      );
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [native3D, project.canvas.width, project.canvas.height]);
  const renderer = useRef<MapRenderer | null>(null);
  const current = useRef({
    project,
    camera,
    layers,
    blend,
    captions,
    onCountry,
    onRegion,
    onCamera,
    onPoint,
    onReady,
    onLayer,
    onError,
  });
  current.current = {
    project,
    camera,
    layers,
    blend,
    captions,
    onCountry,
    onRegion,
    onCamera,
    onPoint,
    onReady,
    onLayer,
    onError,
  };
  const [status, setStatus] = useState('Loading country geography…');
  useEffect(() => {
    let disposed = false;
    const abort = new AbortController();
    let resize: ResizeObserver | undefined;
    void (async () => {
      const response = await fetch('/data/countries.geojson', {
        signal: abort.signal,
      });
      if (!response.ok)
        throw new Error(`Country data unavailable (${response.status})`);
      const countries = (await response.json()) as Countries;
      if (disposed || !container.current) return;
      const r = new MapRenderer(
        container.current,
        countries,
        current.current.camera,
        (c) => current.current.onCountry?.(c),
        (c) => current.current.onCamera?.(c),
        (p) => current.current.onPoint?.(p),
        (id) => current.current.onLayer?.(id),
        (error) => {
          if (disposed) return;
          setStatus(error.message);
          current.current.onError?.(error);
        },
        (code) => current.current.onRegion?.(code),
      );
      renderer.current = r;
      await r.ready();
      if (disposed) return;
      r.apply(
        current.current.project,
        current.current.camera,
        current.current.layers,
        true,
        current.current.blend,
        current.current.captions,
      );
      await r.ready();
      setStatus('');
      current.current.onReady?.(r);
      resize = new ResizeObserver(() => {
        try {
          r.map.resize();
          r.apply(
            current.current.project,
            current.current.camera,
            current.current.layers,
            true,
            current.current.blend,
            current.current.captions,
          );
        } catch (error) {
          const e =
            error instanceof Error ? error : new Error('Map resize failed');
          setStatus(e.message);
          current.current.onError?.(e);
        }
      });
      resize.observe(container.current);
    })().catch((error: unknown) => {
      if (!disposed) {
        setStatus(
          error instanceof Error ? error.message : 'Map initialization failed',
        );
        current.current.onError?.(
          error instanceof Error
            ? error
            : new Error('Map initialization failed'),
        );
      }
    });
    return () => {
      disposed = true;
      abort.abort();
      resize?.disconnect();
      renderer.current?.destroy();
      renderer.current = null;
    };
  }, []);
  useEffect(() => {
    if (!renderer.current) return;
    try {
      renderer.current.apply(project, camera, layers, true, blend, captions);
      setStatus('');
    } catch (error) {
      const e = error instanceof Error ? error : new Error('Map update failed');
      setStatus(e.message);
      current.current.onError?.(e);
    }
  }, [project, camera, layers, blend, captions]);
  return (
    <div
      ref={surface}
      className="map-surface"
      data-testid="map-surface"
      data-native-terrain={!!project.map.terrain}
      data-native-3d={native3D}
      style={
        native3D
          ? {
              width: project.canvas.width,
              height: project.canvas.height,
              transform: `scale(${renderScale})`,
              transformOrigin: '0 0',
            }
          : undefined
      }
    >
      <div
        className="map-host"
        ref={container}
        style={{ position: 'absolute', inset: 0 }}
      />
      {!status && renderer.current && editCoordinates && (
        <EditHandles
          renderer={renderer.current}
          coordinates={editCoordinates}
          onEditPoint={onEditPoint}
        />
      )}
      {status && (
        <div className="map-status" role="status">
          {status}
        </div>
      )}
    </div>
  );
}
