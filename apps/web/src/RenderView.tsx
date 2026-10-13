import { useEffect, useRef, useState } from 'react';
import {
  evaluateProjectAt,
  type RenderState,
} from '@animatemap/animation-core';
import {
  migrateProject,
  type Project,
  type GraphicPass,
  type GraphicPlane,
} from '@animatemap/project-schema';
import type { MapRenderer, DepthFrameMetadata } from '@animatemap/map-engine';
import { MapSurface } from './MapSurface';
declare global {
  interface Window {
    renderStudio?: {
      load: (input: unknown) => Promise<void>;
      frame: (index: number) => Promise<RenderState>;
      pass: (
        pass: GraphicPass,
        plane?: GraphicPlane,
      ) => Promise<{ depth?: DepthFrameMetadata; sourceCredits: string[] }>;
    };
  }
}
export function RenderView() {
  const [project, setProject] = useState<Project | null>(null);
  const [revision, setRevision] = useState(0);
  const snapshot = useRef<Project | null>(null);
  const renderer = useRef<MapRenderer | null>(null);
  const resolveLoad = useRef<(() => void) | null>(null);
  const rejectLoad = useRef<((error: Error) => void) | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const hasFrame = useRef(false);
  useEffect(() => {
    const bodyBackground = document.body.style.background,
      htmlBackground = document.documentElement.style.background;
    document.body.style.background = 'transparent';
    document.documentElement.style.background = 'transparent';
    window.renderStudio = {
      load: async (input) => {
        const p = migrateProject(input);
        if (resolveLoad.current)
          throw new Error('A project is already loading');
        renderer.current = null;
        hasFrame.current = false;
        snapshot.current = p;
        await new Promise<void>((resolve, reject) => {
          resolveLoad.current = resolve;
          rejectLoad.current = reject;
          setProject(p);
          setRevision((value) => value + 1);
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
        r.resetGraphicPass();
        if (root.current) root.current.style.background = '#101e2d';
        r.apply(
          p,
          state.camera,
          state.layers,
          true,
          state.blend,
          state.captions,
        );
        await r.ready();
        hasFrame.current = true;
        return state;
      },
      pass: async (pass, plane = 'incoming') => {
        const r = renderer.current;
        if (!r || !hasFrame.current)
          throw new Error('Evaluate a frame before requesting graphic passes');
        const depth = await r.prepareGraphicPass(pass, plane);
        if (root.current)
          root.current.style.background =
            pass === 'reference' || pass === 'map' ? '#101e2d' : 'transparent';
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
        return {
          ...(depth ? { depth } : {}),
          sourceCredits: r.sourceCredits(),
        };
      },
    };
    return () => {
      delete window.renderStudio;
      document.body.style.background = bodyBackground;
      document.documentElement.style.background = htmlBackground;
    };
  }, []);
  const state = project ? evaluateProjectAt(project, 0) : null;
  return (
    <div
      ref={root}
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
          key={revision}
          project={project}
          camera={state.camera}
          layers={state.layers}
          blend={state.blend}
          captions={state.captions}
          onError={(error) => {
            rejectLoad.current?.(error);
            rejectLoad.current = null;
            resolveLoad.current = null;
          }}
          onReady={(r) => {
            renderer.current = r;
            resolveLoad.current?.();
            resolveLoad.current = null;
            rejectLoad.current = null;
          }}
        />
      )}
    </div>
  );
}
