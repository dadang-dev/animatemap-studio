import React from 'react';
export const ease = (x: number) => {
  const z = Math.max(0, Math.min(1, x));
  return z * z * (3 - 2 * z);
};
const aqua = '#70e9e4',
  gold = '#ffcf76',
  cream = '#fff0d5',
  ink = '#092732';
export const Text = ({
  x = 450,
  y = 440,
  children,
  size = 30,
  color = cream,
}: {
  x?: number;
  y?: number;
  children: React.ReactNode;
  size?: number;
  color?: string;
}) => (
  <text
    x={x}
    y={y}
    textAnchor="middle"
    fontSize={size}
    fill={color}
    fontWeight="700"
  >
    {children}
  </text>
);
export const Boat = ({
  x,
  y,
  p = 0,
  grain = false,
  scale = 1,
}: {
  x: number;
  y: number;
  p?: number;
  grain?: boolean;
  scale?: number;
}) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path d="M-48 0H50L31 22H-28Z" fill={gold} stroke={ink} strokeWidth="3" />
    <path d="M-19-28H13V0H-19Z" fill={cream} />
    <rect x="2" y="-46" width="5" height="20" fill={aqua} />
    {grain
      ? [-21, 0, 21].map((a, i) => (
          <ellipse
            key={i}
            cx={a}
            cy="-7"
            rx="12"
            ry="19"
            fill="#d8a153"
            stroke={ink}
            strokeWidth="2"
          />
        ))
      : [-30, -7, 16].map((a, i) => (
          <rect
            key={i}
            x={a}
            y="-16"
            width="21"
            height="16"
            fill={i % 2 ? aqua : '#ed8f6a'}
            stroke={ink}
            strokeWidth="2"
          />
        ))}
    <path
      d={`M-68 ${27 + Math.sin(p * 4) * 2}h-30m18 10h-30`}
      fill="none"
      stroke={aqua}
      strokeWidth="3"
      opacity=".7"
    />
  </g>
);
export const House = ({
  x,
  y,
  p = 1,
  color = gold,
}: {
  x: number;
  y: number;
  p?: number;
  color?: string;
}) => (
  <g transform={`translate(${x} ${y}) scale(${p})`}>
    <path d="M-29 0V-39H29V0Z" fill={color} stroke={ink} strokeWidth="3" />
    <path d="M-38-38L0-69L38-38Z" fill={cream} stroke={ink} strokeWidth="3" />
    <path d="M-8 0V-23H8V0" fill={ink} />
    <path d="M-22-29h10v11h-10m34-11h-10v11h10" fill={aqua} />
  </g>
);
export const Person = ({
  x,
  y,
  color = gold,
  scale = 1,
}: {
  x: number;
  y: number;
  color?: string;
  scale?: number;
}) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} fill={color}>
    <circle cy="-30" r="12" />
    <path d="M-12-13H12L18 29H8V60H-2V29H-8V60H-18V29H-24Z" />
  </g>
);
export const Fish = ({
  x,
  y,
  scale = 1,
  color = aqua,
}: {
  x: number;
  y: number;
  scale?: number;
  color?: string;
}) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path d="M-42 0Q-10-29 28 0Q-10 29-42 0L-62-18V18Z" fill={color} />
    <circle cx="10" cy="-4" r="3" fill={ink} />
  </g>
);
export const Dolphin = ({
  x,
  y,
  baiji = false,
  s = 1,
}: {
  x: number;
  y: number;
  baiji?: boolean;
  s?: number;
}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path
      d={
        baiji
          ? 'M-172 18Q-80-99 58-48L132-15L198-7L127 4Q59 57-63 39L-138 74L-116 32L-172 18L-218-20L-204 26L-223 62Z'
          : 'M-174 19Q-79-80 53-36Q113-21 134 6L113 26Q25 66-77 36L-130 70L-110 30L-174 19L-216-19L-205 25L-223 60Z'
      }
      fill={baiji ? '#c7dce0' : '#80a9b1'}
      stroke={cream}
      strokeWidth="3"
    />
    {baiji && <path d="M-35-54L-5-112L25-52" fill="#b7cdd2" />}
    <path d="M-20 33L35 91L44 27" fill="#527f8c" />
    <circle cx={baiji ? 93 : 99} cy={baiji ? -12 : 0} r="4" fill={ink} />
  </g>
);
export const Ruler = ({ label, p }: { label: string; p: number }) => (
  <g>
    <path
      d={`M${450 - 310 * p} 355H${450 + 310 * p}m0-14v28M${450 - 310 * p} 341v28`}
      stroke={gold}
      strokeWidth="4"
    />
    <Text y={408} size={47} color={gold}>
      {label}
    </Text>
  </g>
);
