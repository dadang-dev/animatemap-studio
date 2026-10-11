import type { ProjectProposal } from './proposals';
export const proposalFixture: ProjectProposal = {
  version: 1,
  supported: true,
  title: 'Authored protocol fixture',
  summary: 'Synthetic unit-test proposal, not a model response.',
  scenes: [
    {
      name: 'Vietnam reference',
      durationSeconds: 2,
      camera: [
        {
          time: 0,
          lng: 106,
          lat: 16,
          zoom: 5,
          bearing: 0,
          pitch: 0,
          easing: 'linear',
        },
      ],
      layers: [
        {
          type: 'countryHighlight',
          name: 'Vietnam',
          start: 0,
          end: 2,
          countryCodes: ['VNM'],
          color: '#307e72',
        },
        {
          type: 'marker',
          name: 'Hanoi',
          start: 0,
          end: 2,
          placeId: 'ne-1159151251',
          color: '#ffd087',
          size: 24,
        },
        {
          type: 'text',
          name: 'Title',
          start: 0,
          end: 2,
          text: 'Hành trình Việt Nam',
          x: 0.08,
          y: 0.08,
          fontSize: 48,
          color: '#ffffff',
        },
      ],
    },
  ],
};
