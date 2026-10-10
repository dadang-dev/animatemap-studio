import type { Dataset, Layer } from '@animatemap/project-schema';
import {
  interpolateColor,
  type ChoroplethData,
} from '@animatemap/animation-core';

export function dataLegend(
  dataset: Dataset,
  layer: Extract<Layer, { type: 'choropleth' }>,
  data: ChoroplethData,
  scale: number,
  width: number,
  height: number,
) {
  const legend = document.createElement('div');
  legend.dataset.legendId = layer.id;
  legend.dataset.layerId = layer.id;
  const format = (value: number) =>
    new Intl.NumberFormat('en-US', { maximumSignificantDigits: 6 }).format(
      value,
    );
  Object.assign(legend.style, {
    position: 'absolute',
    left: `${layer.legend.x * width}px`,
    top: `${layer.legend.y * height}px`,
    width: `${330 * scale}px`,
    padding: `${12 * scale}px`,
    background: '#0c1629e8',
    color: '#ffffff',
    fontSize: `${18 * scale}px`,
    lineHeight: '1.35',
    opacity: `${layer.opacity}`,
    borderRadius: `${4 * scale}px`,
  });
  const title = document.createElement('div');
  Object.assign(title.style, {
    display: 'flex',
    gap: `${6 * scale}px`,
    fontWeight: 'bold',
  });
  const name = document.createElement('span');
  name.textContent = dataset.name;
  name.title = dataset.name;
  Object.assign(name.style, {
    flex: '1',
    minWidth: '0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  });
  const year = document.createElement('span');
  year.dataset.legendYear = '';
  year.textContent = `· ${new Intl.NumberFormat('en-US', { useGrouping: false, maximumFractionDigits: 2 }).format(data.year)}`;
  year.style.flexShrink = '0';
  title.append(name, year);
  // A fixed opaque pixel ramp avoids compositor-dependent CSS gradient dithering.
  const bar = document.createElement('canvas');
  bar.width = 306;
  bar.height = 1;
  const context = bar.getContext('2d');
  if (!context) throw new Error('Color legend requires a 2D canvas context');
  const pixels = context.createImageData(bar.width, 1);
  for (let column = 0; column < bar.width; column++) {
    const color = interpolateColor(
      layer.style.color,
      layer.style.highColor,
      column / (bar.width - 1),
    );
    pixels.data.set(
      [
        parseInt(color.slice(1, 3), 16),
        parseInt(color.slice(3, 5), 16),
        parseInt(color.slice(5, 7), 16),
        255,
      ],
      column * 4,
    );
  }
  context.putImageData(pixels, 0, 0);
  Object.assign(bar.style, {
    display: 'block',
    width: '100%',
    height: `${12 * scale}px`,
    margin: `${8 * scale}px 0`,
    imageRendering: 'pixelated',
  });
  const domain = document.createElement('div');
  domain.textContent = `${format(layer.domain.min)} — ${format(layer.domain.max)}${dataset.unit ? ` ${dataset.unit}` : ''}`;
  const status = document.createElement('div');
  status.textContent = data.estimated
    ? layer.sampling === 'linear'
      ? 'Interpolated between observations'
      : 'Held preceding observation'
    : 'Observed values';
  const missing = document.createElement('div');
  missing.textContent = 'Missing · outside observed year range';
  status.style.fontSize = missing.style.fontSize = `${14 * scale}px`;
  const swatch = document.createElement('span');
  Object.assign(swatch.style, {
    display: 'inline-block',
    background: layer.style.missingColor,
    width: `${10 * scale}px`,
    height: `${10 * scale}px`,
    marginRight: `${6 * scale}px`,
  });
  missing.prepend(swatch);
  legend.append(title, bar, domain, status, missing);
  return legend;
}
