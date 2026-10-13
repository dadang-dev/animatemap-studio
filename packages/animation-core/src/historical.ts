import type { HistoricalDataset } from '../../project-schema/src/historical';
import {
  historyPolygons,
  historySignedArea,
  unwrapHistoryRing,
  validateHistoricalGeometry,
  type HistoricalGeometry,
  type HistoryPoint,
} from '../../project-schema/src/historicalGeometry';
export type HistoricalState = {
  status: 'source' | 'morph' | 'missing' | 'blocked';
  year: number;
  label: string;
  uncertainty: string;
  features: { regionId: string; name: string; geometry: HistoricalGeometry }[];
  sourceEpochIds: string[];
};
type Prepared = { a: HistoryPoint[]; b: HistoryPoint[] };
const cache = new WeakMap<
  HistoricalGeometry,
  WeakMap<HistoricalGeometry, Prepared>
>();
const wrap = (lng: number) => ((((lng + 180) % 360) + 360) % 360) - 180;
function sample(ring: HistoryPoint[], count: number) {
  const points = unwrapHistoryRing(ring),
    scale = Math.cos(
      ((points.reduce((n, p) => n + p[1], 0) / points.length) * Math.PI) / 180,
    ),
    lengths = points
      .slice(1)
      .map((p, i) =>
        Math.hypot((p[0] - points[i]![0]) * scale, p[1] - points[i]![1]),
      ),
    total = lengths.reduce((n, v) => n + v, 0);
  if (total <= 0 || !Number.isFinite(total))
    throw new Error('Morph boundary has no perimeter');
  const output: HistoryPoint[] = [];
  let segment = 0,
    done = 0;
  for (let i = 0; i < count; i++) {
    const target = (i / count) * total;
    while (segment < lengths.length - 1 && done + lengths[segment]! < target) {
      done += lengths[segment]!;
      segment++;
    }
    const a = points[segment]!,
      b = points[segment + 1]!,
      fraction = lengths[segment]
        ? Math.max(0, Math.min(1, (target - done) / lengths[segment]!))
        : 0;
    output.push([
      a[0] + (b[0] - a[0]) * fraction,
      a[1] + (b[1] - a[1]) * fraction,
    ]);
  }
  return output;
}
function prepare(from: HistoricalGeometry, to: HistoricalGeometry): Prepared {
  const previous = cache.get(from)?.get(to);
  if (previous) return previous;
  if (
    from.type !== 'Polygon' ||
    to.type !== 'Polygon' ||
    from.coordinates.length !== 1 ||
    to.coordinates.length !== 1
  )
    throw new Error(
      'Illustrative morph currently requires one simple Polygon without holes; source cuts preserve all parts/holes',
    );
  validateHistoricalGeometry(from);
  validateHistoricalGeometry(to);
  const count = 256,
    a = sample(from.coordinates[0]!, count);
  let b = sample(to.coordinates[0]!, count);
  const close = (r: HistoryPoint[]) => [...r, r[0]!] as HistoryPoint[];
  if (
    Math.sign(historySignedArea(close(a))) !==
    Math.sign(historySignedArea(close(b)))
  )
    b = b.reverse();
  const shift =
    360 *
    Math.round(
      (a.reduce((n, p) => n + p[0], 0) - b.reduce((n, p) => n + p[0], 0)) /
        count /
        360,
    );
  b = b.map(([x, y]) => [x + shift, y]);
  let best = Infinity,
    offset = 0;
  for (let k = 0; k < count; k++) {
    let cost = 0;
    for (let i = 0; i < count; i++) {
      const p = a[i]!,
        q = b[(i + k) % count]!;
      cost += (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
    }
    if (cost < best) {
      best = cost;
      offset = k;
    }
  }
  const result = { a, b: a.map((_, i) => b[(i + offset) % count]!) };
  for (const time of [0.125, 0.25, 0.5, 0.75, 0.875]) interpolate(result, time);
  let targets = cache.get(from);
  if (!targets) {
    targets = new WeakMap();
    cache.set(from, targets);
  }
  targets.set(to, result);
  return result;
}
function interpolate(prepared: Prepared, fraction: number): HistoricalGeometry {
  const ring = prepared.a.map((p, i): HistoryPoint => {
    const q = prepared.b[i]!;
    return [
      wrap(p[0] + (q[0] - p[0]) * fraction),
      p[1] + (q[1] - p[1]) * fraction,
    ];
  });
  ring.push([...ring[0]!]);
  const geometry: HistoricalGeometry = { type: 'Polygon', coordinates: [ring] };
  validateHistoricalGeometry(geometry, { remaining: 1000000 });
  return geometry;
}
/** Derived geometry never replaces original source snapshots; unsafe candidates return a diagnostic. */
export function evaluateHistorical(
  dataset: HistoricalDataset,
  regionIds: string[],
  year: number,
  mode: 'source' | 'morph',
): HistoricalState {
  const wanted = new Set(regionIds),
    wholeYear = Math.floor(year),
    epoch = dataset.epochs.find(
      (e) => wholeYear >= e.fromYear && wholeYear <= e.toYear,
    );
  const base = { year, uncertainty: dataset.provenance.uncertainty };
  if (!epoch)
    return {
      ...base,
      status: 'missing',
      label: `No documented boundary data for year ${wholeYear}`,
      features: [],
      sourceEpochIds: [],
    };
  const selected = epoch.features.filter((f) => wanted.has(f.regionId));
  const source = (): HistoricalState => ({
    ...base,
    status: 'source',
    label: `${epoch.name} · published years ${epoch.fromYear}–${epoch.toYear}`,
    uncertainty: epoch.uncertainty,
    features: selected.map((f) => ({
      regionId: f.regionId,
      name: f.name,
      geometry: f.geometry,
    })),
    sourceEpochIds: [epoch.id],
  });
  if (mode === 'source') return source();
  if (regionIds.length !== 1)
    return {
      ...base,
      status: 'blocked',
      label:
        'Select one region for illustrative morph; multi-region partition morphing is unsupported',
      features: [],
      sourceEpochIds: [epoch.id],
    };
  const index = dataset.epochs.indexOf(epoch),
    next = dataset.epochs[index + 1];
  if (!next || year <= epoch.fromYear) return source();
  const from = selected[0],
    to = next.features.find((f) => f.regionId === regionIds[0]);
  if (!from || !to)
    return {
      ...base,
      status: 'blocked',
      label:
        'Morph region has no explicit identity correspondence in both snapshots',
      features: [],
      sourceEpochIds: [epoch.id, next.id],
    };
  try {
    const fraction = (year - epoch.fromYear) / (next.fromYear - epoch.fromYear),
      geometry = interpolate(prepare(from.geometry, to.geometry), fraction);
    return {
      ...base,
      status: 'morph',
      label: `Illustrative ${Math.round(fraction * 100)}% transition · ${epoch.fromYear} → ${next.fromYear} · not factual year ${wholeYear} borders`,
      uncertainty: `${epoch.uncertainty} ${next.uncertainty} Boundary resampled to 256 perimeter points; candidate topology checked.`,
      features: [{ regionId: from.regionId, name: from.name, geometry }],
      sourceEpochIds: [epoch.id, next.id],
    };
  } catch (error) {
    return {
      ...base,
      status: 'blocked',
      label: `Morph blocked: ${error instanceof Error ? error.message : 'unsafe topology'}`,
      features: [],
      sourceEpochIds: [epoch.id, next.id],
    };
  }
}
export function historicalGeometryBounds(geometry: HistoricalGeometry) {
  const points = historyPolygons(geometry).flatMap((p) => p.flat());
  return {
    west: Math.min(...points.map((p) => p[0])),
    east: Math.max(...points.map((p) => p[0])),
    south: Math.min(...points.map((p) => p[1])),
    north: Math.max(...points.map((p) => p[1])),
  };
}
