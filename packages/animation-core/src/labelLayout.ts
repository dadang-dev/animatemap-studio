import type { Layer } from '@animatemap/project-schema';

export type LabelBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};
export type LabelCandidate = {
  id: string;
  mode: 'allow' | 'hide';
  priority: number;
  order: number;
  bounds: LabelBounds;
};
/** CSS translate/rotate/scale about an explicit project-pixel origin. */
export function transformLabelBounds(
  bounds: LabelBounds,
  origin: { x: number; y: number },
  transform: Layer['transform'],
): LabelBounds {
  const angle = (transform.rotation * Math.PI) / 180;
  const cosine = Math.cos(angle) * transform.scale;
  const sine = Math.sin(angle) * transform.scale;
  const points = [
    [bounds.x, bounds.y],
    [bounds.x + bounds.width, bounds.y],
    [bounds.x, bounds.y + bounds.height],
    [bounds.x + bounds.width, bounds.y + bounds.height],
  ].map(([x, y]) => ({
    x:
      origin.x +
      transform.offsetX +
      (x! - origin.x) * cosine -
      (y! - origin.y) * sine,
    y:
      origin.y +
      transform.offsetY +
      (x! - origin.x) * sine +
      (y! - origin.y) * cosine,
  }));
  const left = Math.min(...points.map((point) => point.x));
  const top = Math.min(...points.map((point) => point.y));
  return {
    x: left,
    y: top,
    width: Math.max(...points.map((point) => point.x)) - left,
    height: Math.max(...points.map((point) => point.y)) - top,
  };
}
function clip(bounds: LabelBounds, viewport: LabelBounds) {
  const x = Math.max(bounds.x, viewport.x);
  const y = Math.max(bounds.y, viewport.y);
  const right = Math.min(bounds.x + bounds.width, viewport.x + viewport.width);
  const bottom = Math.min(
    bounds.y + bounds.height,
    viewport.y + viewport.height,
  );
  return right > x && bottom > y
    ? { x, y, width: right - x, height: bottom - y }
    : undefined;
}
function padded(bounds: LabelBounds, padding: number) {
  return {
    x: bounds.x - padding / 2,
    y: bounds.y - padding / 2,
    width: bounds.width + padding,
    height: bounds.height + padding,
  };
}
function overlaps(a: LabelBounds, b: LabelBounds) {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}
/** Stateless selection: callers supply bounds at full project resolution. */
export function hiddenLabels(
  candidates: readonly LabelCandidate[],
  viewport: LabelBounds,
  padding = 4,
): Set<string> {
  const occupied: LabelBounds[] = [];
  const hidden = new Set<string>();
  for (const label of candidates.filter((label) => label.mode === 'allow')) {
    const bounds = clip(label.bounds, viewport);
    if (bounds) occupied.push(padded(bounds, padding));
  }
  const optional = candidates
    .filter((label) => label.mode === 'hide')
    .sort(
      (a, b) =>
        b.priority - a.priority ||
        b.order - a.order ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
  for (const label of optional) {
    const visible = clip(label.bounds, viewport);
    const bounds = visible && padded(visible, padding);
    if (!bounds || occupied.some((other) => overlaps(bounds, other)))
      hidden.add(label.id);
    else occupied.push(bounds);
  }
  return hidden;
}
