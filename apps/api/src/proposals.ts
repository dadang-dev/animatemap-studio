import { randomUUID } from 'node:crypto';
import {
  migrateProject,
  layerSchema,
  type Project,
} from '@animatemap/project-schema';
import { projectProposalSchema } from '@animatemap/project-schema';
import places from '../../../data/places/catalog.json' with { type: 'json' };
import provenance from '../../../data/places/PROVENANCE.json' with { type: 'json' };
import countries from '../../../data/countries/catalog.json' with { type: 'json' };
const placeIndex = new Map(places.map((p) => [p.id, p]));
const countryIndex = new Set(countries.map((c) => c.code));
export function normalizeProposal(
  input: unknown,
  original: Project,
  now = new Date().toISOString(),
): Project {
  const proposal = projectProposalSchema.parse(input);
  if (!proposal.supported)
    throw new Error(`Codex cannot support that request: ${proposal.summary}`);
  if (!proposal.scenes.length) throw new Error('Codex returned no scenes');
  const project = migrateProject({
    ...original,
    name: proposal.title,
    scenes: [
      {
        ...original.scenes[0],
        id: randomUUID(),
        name: 'Proposal',
        startSeconds: 0,
        durationSeconds: 1,
        transition: { type: 'cut' },
        camera: {
          keyframes: [
            {
              time: 0,
              value: { lng: 0, lat: 0, zoom: 2, bearing: 0, pitch: 0 },
              easing: 'linear',
            },
          ],
        },
        layers: [],
      },
    ],
    durationSeconds: 1,
    assets: [],
    datasets: [],
    audioAssets: [],
    audioTracks: [],
    captions: {
      enabled: false,
      cues: [],
      style: {
        fontSize: 44,
        color: '#ffffff',
        background: '#111820',
        x: 0.5,
        y: 0.86,
        width: 0.85,
      },
    },
  });
  let start = 0;
  project.scenes = proposal.scenes.map((scene) => {
    const duration = scene.durationSeconds;
    const layers = scene.layers.map((layer) => {
      const common = {
        id: randomUUID(),
        name: layer.name,
        type: layer.type,
        timeRange: { start: layer.start, end: layer.end },
      };
      if (layer.type === 'countryHighlight') {
        if (
          new Set(layer.countryCodes).size !== layer.countryCodes.length ||
          layer.countryCodes.some((c) => !countryIndex.has(c))
        )
          throw new Error(
            'Codex returned an unknown or duplicate country reference',
          );
        return layerSchema.parse({
          ...common,
          countryCodes: layer.countryCodes,
          style: {
            color: layer.color,
            stroke: '#75d9bd',
            width: 1.5,
            dimOutside: 0.1,
          },
        });
      }
      if (layer.type === 'route') {
        if (new Set(layer.placeIds).size < 2)
          throw new Error('Codex route requires two distinct verified places');
        const stops = layer.placeIds.map((id) => {
          const place = placeIndex.get(id);
          if (!place)
            throw new Error('Codex returned an unknown route place reference');
          return place;
        });
        return layerSchema.parse({
          ...common,
          name: `Illustrative connection · ${stops.map((s) => s.name).join(' → ')}`.slice(
            0,
            200,
          ),
          coordinates: stops.map((s) => s.coordinates),
          style: {
            color: layer.color,
            width: layer.width,
            dash: false,
            arrow: true,
          },
          tracks: {
            reveal: [
              { time: layer.start, value: 0, easing: 'linear' },
              { time: layer.end, value: 1, easing: 'linear' },
            ],
          },
        });
      }
      if (layer.type === 'marker') {
        const place = placeIndex.get(layer.placeId);
        if (!place)
          throw new Error('Codex returned an unknown marker place reference');
        return layerSchema.parse({
          ...common,
          name: place.name,
          label: place.name,
          anchor: { type: 'map', coordinates: place.coordinates },
          style: { color: layer.color, size: layer.size, icon: 'pin' },
          geographySource: {
            provider: 'natural-earth',
            kind: 'place',
            sourceId: place.id,
            source: 'https://www.naturalearthdata.com/',
            license: 'Public domain',
            credit: `Natural Earth places · v${provenance.release}`,
            retrievedAt: now,
            datasetVersion: provenance.release,
            sha256: provenance.sha256,
          },
        });
      }
      return layerSchema.parse({
        ...common,
        text: layer.text,
        anchor: { type: 'screen', x: layer.x, y: layer.y },
        style: {
          color: layer.color,
          fontSize: layer.fontSize,
          fontWeight: 'bold',
          align: 'left',
        },
      });
    });
    const result = {
      id: randomUUID(),
      name: scene.name,
      startSeconds: start,
      durationSeconds: duration,
      transition: { type: 'cut' as const },
      camera: {
        keyframes: scene.camera.map(({ time, easing, ...value }) => ({
          time,
          easing,
          value,
        })),
      },
      layers,
    };
    start += duration;
    return result;
  });
  project.durationSeconds = start;
  return migrateProject(project);
}
export function proposalContext(project: Project, prompt: string) {
  const terms = prompt
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('en')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((s) => s.length >= 3);
  const fold = (s: string) =>
    s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLocaleLowerCase('en');
  const request = ` ${fold(prompt).replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
  const matched = places
    .map((place) => ({
      place,
      score:
        Math.max(
          0,
          ...place.names
            .filter((n) => n.length >= 3)
            .map((name) =>
              request.includes(` ${fold(name)} `) ? 1000 + name.length : 0,
            ),
        ) +
        (request.includes(` ${fold(place.country)} `) ? 100 : 0) +
        terms.filter((term) =>
          fold([...place.names, place.country].join(' ')).includes(term),
        ).length,
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.place.id.localeCompare(b.place.id))
    .slice(0, 60)
    .map((row) => row.place);
  const fallback = places
    .filter((place) =>
      [
        'Vietnam',
        'Thailand',
        'Cambodia',
        'Laos',
        'Singapore',
        'Malaysia',
      ].includes(place.country),
    )
    .sort(
      (a, b) =>
        Number(b.country === 'Vietnam') - Number(a.country === 'Vietnam') ||
        a.id.localeCompare(b.id),
    );
  const catalog = [
    ...new Map([...matched, ...fallback].map((p) => [p.id, p])).values(),
  ]
    .slice(0, 80)
    .map(({ id, name, country, coordinates }) => ({
      id,
      name,
      country,
      coordinates,
    }));
  return {
    canvas: project.canvas,
    mapStyle: project.map.styleId,
    currentProject: {
      name: project.name,
      durationSeconds: project.durationSeconds,
      scenes: project.scenes.map((s) => ({
        name: s.name,
        durationSeconds: s.durationSeconds,
        layerTypes: s.layers.map((l) => l.type),
      })),
    },
    countries,
    places: catalog,
  };
}
