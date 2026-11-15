import React from 'react';
import { Composition, registerRoot } from 'remotion';
import data from '../public/project.json';
import { Film } from './Film';
import { FontReady } from './shared/FontReady';
registerRoot(() => (
  <Composition
    id={data.id}
    component={() => (
      <FontReady>
        <Film />
      </FontReady>
    )}
    durationInFrames={Math.ceil(data.duration * data.fps)}
    width={data.width}
    height={data.height}
    fps={data.fps}
  />
));
