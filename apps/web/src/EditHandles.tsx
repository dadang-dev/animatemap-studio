import { useEffect, useState } from 'react';
import type { MapRenderer } from '@animatemap/map-engine';
export function EditHandles({
  renderer,
  coordinates,
  onEditPoint,
}: {
  renderer: MapRenderer;
  coordinates: [number, number][];
  onEditPoint?: (index: number) => void;
}) {
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  useEffect(() => {
    const update = () => {
      const center = renderer.map.getCenter().lng;
      setPoints(
        coordinates.map(([lng, lat]) =>
          renderer.map.project([
            lng + 360 * Math.round((center - lng) / 360),
            lat,
          ]),
        ),
      );
    };
    update();
    renderer.map.on('move', update);
    renderer.map.on('resize', update);
    return () => {
      renderer.map.off('move', update);
      renderer.map.off('resize', update);
    };
  }, [renderer, coordinates]);
  return (
    <div className="shape-edit-controls" data-testid="shape-edit-controls">
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible',
        }}
        aria-hidden="true"
      >
        <polyline
          points={points.map((point) => `${point.x},${point.y}`).join(' ')}
          fill="none"
          stroke="#9be5ff"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      </svg>
      {points.map((point, index) => (
        <button
          key={index}
          aria-label={`Reposition shape point ${index + 1}`}
          title={`Point ${index + 1} · Click, then choose its new map position`}
          style={{
            position: 'absolute',
            left: point.x,
            top: point.y,
            transform: 'translate(-50%,-50%)',
          }}
          onClick={(event) => {
            event.stopPropagation();
            onEditPoint?.(index);
          }}
        >
          {index + 1}
        </button>
      ))}
    </div>
  );
}
