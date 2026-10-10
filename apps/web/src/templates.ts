import {
  createDemo,
  migrateProject,
  type Project,
} from '@animatemap/project-schema';

export interface Template {
  id: string;
  name: string;
  description: string;
  category: 'Travel' | 'Highlight' | 'Portrait' | 'Story' | 'Saved';
  project: Project;
}

function portrait(): Project {
  const project = createDemo();
  project.id = 'template-portrait';
  project.name = 'Hanoi · Portrait reveal';
  project.canvas = { width: 1080, height: 1920, fps: 30 };
  project.durationSeconds = 8;
  const scene = project.scenes[0]!;
  scene.durationSeconds = 8;
  scene.name = 'Hanoi reveal';
  scene.camera.keyframes = [
    {
      time: 0,
      value: { lng: 105.85, lat: 21.03, zoom: 1.4, bearing: 0, pitch: 0 },
      easing: 'easeInOut',
    },
    {
      time: 5,
      value: { lng: 105.85, lat: 21.03, zoom: 5.3, bearing: 8, pitch: 25 },
      easing: 'easeInOut',
    },
    {
      time: 8,
      value: { lng: 105.85, lat: 21.03, zoom: 5.3, bearing: 14, pitch: 25 },
      easing: 'linear',
    },
  ];
  scene.layers = scene.layers.filter(
    (layer) =>
      layer.type === 'countryHighlight' ||
      layer.type === 'text' ||
      layer.id === 'marker-0',
  );
  for (const layer of scene.layers) {
    layer.timeRange.end = 8;
    if (layer.type === 'marker') {
      layer.style.size = 38;
      layer.tracks.opacity = [
        { time: 2.5, value: 0, easing: 'easeOut' },
        { time: 4, value: 1, easing: 'linear' },
      ];
    }
    if (layer.type === 'text') {
      layer.text = 'HÀ NỘI\nThe journey begins';
      layer.anchor = { type: 'screen', x: 0.08, y: 0.08 };
      layer.style.fontSize = 64;
      layer.tracks.opacity = [
        { time: 0, value: 0, easing: 'easeOut' },
        { time: 1, value: 1, easing: 'linear' },
      ];
    }
  }
  return migrateProject(project);
}

function story(): Project {
  const project = createDemo('highlight');
  project.id = 'template-story';
  project.name = 'Two countries · A visual story';
  const first = project.scenes[0]!;
  first.durationSeconds = 6;
  first.name = 'Vietnam';
  first.camera.keyframes = [
    {
      time: 0,
      value: { lng: 108, lat: 16, zoom: 4, bearing: 0, pitch: 0 },
      easing: 'easeInOut',
    },
    {
      time: 6,
      value: { lng: 107, lat: 16, zoom: 5, bearing: 10, pitch: 25 },
      easing: 'linear',
    },
  ];
  for (const layer of first.layers) {
    layer.timeRange.end = 6;
    if (layer.type === 'countryHighlight') layer.countryCodes = ['VNM'];
    if (layer.type === 'text') layer.text = 'VIỆT NAM';
  }
  const second = structuredClone(first);
  second.id = 'scene-thailand';
  second.name = 'Thailand';
  second.startSeconds = 6;
  second.camera.keyframes = [
    {
      time: 0,
      value: { lng: 101, lat: 16, zoom: 4.5, bearing: -10, pitch: 25 },
      easing: 'easeInOut',
    },
    {
      time: 6,
      value: { lng: 100.5, lat: 13.8, zoom: 5.2, bearing: 0, pitch: 15 },
      easing: 'linear',
    },
  ];
  for (const layer of second.layers) {
    layer.id = `thailand-${layer.id}`;
    if (layer.type === 'countryHighlight') {
      layer.countryCodes = ['THA'];
      layer.style.color = '#665998';
    }
    if (layer.type === 'text') layer.text = 'THAILAND';
  }
  project.scenes.push(second);
  return migrateProject(project);
}

export const builtInTemplates: Template[] = [
  {
    id: 'travel',
    name: 'Vietnam journey',
    description: 'Three stops, a geodesic route and cinematic camera movement.',
    category: 'Travel',
    project: createDemo(),
  },
  {
    id: 'highlight',
    name: 'Southeast Asia focus',
    description: 'Country highlights with a title and background dimming.',
    category: 'Highlight',
    project: createDemo('highlight'),
  },
  {
    id: 'portrait',
    name: 'Hanoi portrait',
    description:
      'Vertical 9:16 reveal with Vietnamese labels and a city marker.',
    category: 'Portrait',
    project: portrait(),
  },
  {
    id: 'story',
    name: 'Two-country story',
    description:
      'A complete two-scene sequence with a cut and independent cameras.',
    category: 'Story',
    project: story(),
  },
];

export function instantiateTemplate(
  template: Template,
  newId: () => string = () => crypto.randomUUID(),
): Project {
  const project = migrateProject(structuredClone(template.project));
  project.id = newId();
  project.name = template.name;
  for (const scene of project.scenes) {
    scene.id = newId();
    for (const layer of scene.layers) layer.id = newId();
  }
  return migrateProject(project);
}

export function savedTemplate(name: string, project: Project): Template {
  const title = name.trim();
  if (!title || title.length > 200)
    throw new Error('Template name must contain 1–200 characters');
  return {
    id: crypto.randomUUID(),
    name: title,
    description: 'Saved on this device',
    category: 'Saved',
    project: migrateProject(structuredClone(project)),
  };
}
