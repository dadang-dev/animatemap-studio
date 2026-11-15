import React from 'react';
export type ReferenceGeo = {
  countries: Record<string, string>;
  islands: { path: string }[];
  archipelagos: { name: string; anchor: number[] }[];
};
const gold = '#ffcf76';
export const merc = (p: number[]) => [
  ((p[0] + 180) / 360) * 65536,
  ((1 - Math.asinh(Math.tan((p[1] * Math.PI) / 180)) / Math.PI) / 2) * 65536,
];
export function VietnamLocator({ geo }: { geo: ReferenceGeo }) {
  const s = 0.058,
    tx = -2966.77,
    ty = -1634.67;
  return (
    <div className="locator" data-box="locator">
      <div>VIỆT NAM</div>
      <svg viewBox="0 0 260 240" className="vn-locator">
        <path
          d={geo.countries.VNM}
          transform={`translate(${tx} ${ty}) scale(${s})`}
          fill="#294e57"
          stroke="#c0e4da"
          strokeWidth="12"
          fillRule="evenodd"
        />
        {geo.islands.map((a, i) => (
          <path
            key={i}
            d={a.path}
            transform={`translate(${tx} ${ty}) scale(${s})`}
            fill={gold}
            stroke={gold}
            strokeWidth="15"
          />
        ))}
        {geo.archipelagos.map((a, i) => (
          <g key={i}>
            <circle
              cx={tx + a.anchor[0] * s}
              cy={ty + a.anchor[1] * s}
              r="2"
              fill={gold}
            />
            <text
              x={tx + a.anchor[0] * s + 7}
              y={ty + a.anchor[1] * s + (i ? 8 : -5)}
              fontSize="18"
              fill={gold}
            >
              {i ? 'Trường Sa' : 'Hoàng Sa'}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
