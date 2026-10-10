import { useEffect, useRef, useState } from 'react';
import {
  evaluateProjectAt,
  type RenderState,
} from '@animatemap/animation-core';
import { migrateProject, type Project } from '@animatemap/project-schema';
import type { MapRenderer } from '@animatemap/map-engine';
import { MapSurface } from './MapSurface';
declare global {
  interface Window {
    renderStudio?: {
      load: (input: unknown) => Promise<void>;
      frame: (index: number) => Promise<RenderState>;
    };
  }
}
export function RenderView() {
  const [project, setProject] = useState<Project | null>(null);
  const snapshot = useRef<Project | null>(null);
  const renderer = useRef<MapRenderer | null>(null);
  const resolveLoad = useRef<(() => void) | null>(null);
  useEffect(() => {
    window.renderStudio = {
      load: async (input) => {
        const p = migrateProject(input);
        snapshot.current = p;
        await new Promise<void>((resolve) => {
          resolveLoad.current = resolve;
          setProject(p);
        });
      },
      frame: async (index) => {
        const p = snapshot.current,
          r = renderer.current;
        if (!p || !r) throw new Error('Renderer not initialized');
        if (
          !Number.isInteger(index) ||
          index < 0 ||
          index >= Math.ceil(p.durationSeconds * p.canvas.fps)
        )
          throw new Error('Frame index outside project');
        const state = evaluateProjectAt(p, index / p.canvas.fps);
        r.apply(p, state.camera, state.layers);
        await r.ready();
        return state;
      },
    };
    return () => {
      delete window.renderStudio;
    };
  }, []);
  const state = project ? evaluateProjectAt(project, 0) : null;
  return (
    <div
      className="render-root"
      style={{
        position: 'relative',
        width: project?.canvas.width ?? '100vw',
        height: project?.canvas.height ?? '100vh',
        background: '#101e2d',
        overflow: 'hidden',
      }}
    >
      {project && state && (
        <MapSurface
          project={project}
          camera={state.camera}
          layers={state.layers}
          onReady={(r) => {
            renderer.current = r;
            resolveLoad.current?.();
            resolveLoad.current = null;
          }}
        />
      )}
    </div>
  );
}
