import { useEffect, useRef, useState } from 'react';
import { MapRenderer, type Countries } from '@animatemap/map-engine';
import type { Camera, Project } from '@animatemap/project-schema';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { SceneBlend, RenderLayer } from '@animatemap/animation-core';
import { EditHandles } from './EditHandles';
export function MapSurface({
  project,
  camera,
  layers = project.scenes[0]!.layers,
  blend,
  onCountry,
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
  onCountry?: (code: string) => void;
  onCamera?: (camera: Camera) => void;
  onPoint?: (point: [number, number]) => void;
  onReady?: (renderer: MapRenderer) => void;
  onLayer?: (id: string) => void;
  onError?: (error: Error) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const renderer = useRef<MapRenderer | null>(null);
  const current = useRef({
    project,
    camera,
    layers,
    blend,
    onCountry,
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
    onCountry,
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
      renderer.current.apply(project, camera, layers, true, blend);
      setStatus('');
    } catch (error) {
      const e = error instanceof Error ? error : new Error('Map update failed');
      setStatus(e.message);
      current.current.onError?.(e);
    }
  }, [project, camera, layers, blend]);
  return (
    <div className="map-surface" data-testid="map-surface">
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
