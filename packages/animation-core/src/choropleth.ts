import type { Dataset, Layer } from '@animatemap/project-schema';
import { clamp } from './numeric';

export type ChoroplethData = {
  year: number;
  values: Record<string, number | null>;
  colors: Record<string, string>;
  estimated: boolean;
};
export function interpolateColor(low: string, high: string, fraction: number) {
  const t = clamp(fraction, 0, 1);
  return (
    '#' +
    [1, 3, 5]
      .map((position) => {
        const a = parseInt(low.slice(position, position + 2), 16);
        const b = parseInt(high.slice(position, position + 2), 16);
        return Math.round(a + (b - a) * t)
          .toString(16)
          .padStart(2, '0');
      })
      .join('')
  );
}
export function evaluateChoropleth(
  dataset: Dataset,
  layer: Extract<Layer, { type: 'choropleth' }>,
  year: number,
): ChoroplethData {
  const groups = new Map<string, Dataset['records']>();
  for (const record of dataset.records) {
    const records = groups.get(record.countryCode) ?? [];
    records.push(record);
    groups.set(record.countryCode, records);
  }
  const values: Record<string, number | null> = {};
  const colors: Record<string, string> = {};
  let estimated = false;
  for (const [code, unsorted] of groups) {
    const records = [...unsorted].sort((a, b) => a.year - b.year);
    let value: number | null = null;
    if (year >= records[0]!.year && year <= records.at(-1)!.year) {
      const exact = records.find((record) => record.year === year);
      if (exact) value = exact.value;
      else {
        const next = records.findIndex((record) => record.year > year);
        const a = records[next - 1]!,
          b = records[next]!;
        value =
          layer.sampling === 'step'
            ? a.value
            : a.value +
              (b.value - a.value) * ((year - a.year) / (b.year - a.year));
        estimated = true;
      }
    }
    values[code] = value;
    colors[code] =
      value === null
        ? layer.style.missingColor
        : interpolateColor(
            layer.style.color,
            layer.style.highColor,
            (value - layer.domain.min) / (layer.domain.max - layer.domain.min),
          );
  }
  return { year, values, colors, estimated };
}
