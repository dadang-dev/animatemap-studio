export const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));
export const wrap = (n: number) => ((((n + 180) % 360) + 360) % 360) - 180;
