import { test, expect } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  audioFixtureProject,
  toneWav,
} from '../../../packages/project-schema/src/audio.fixture';
import { inspectWav } from '@animatemap/project-schema';
import { audioGainAt } from '../../../packages/animation-core/src/index';
import { audioMixArguments } from './audio';
const exec = promisify(execFile);

test('real FFmpeg PCM mixing matches gain/fade/offset/silence/overlap and hard clipping sample by sample', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'animatemap-audio-'));
  try {
    const input = join(directory, 'source with spaces.wav'),
      output = join(directory, 'mixed.wav'),
      project = audioFixtureProject();
    const source = toneWav(),
      original = new DataView(source.buffer);
    await writeFile(input, source);
    const verify = async () => {
      const args = audioMixArguments(
        project,
        new Map([['tone', input]]),
        output,
      )!;
      await exec('ffmpeg', args);
      const bytes = new Uint8Array(await readFile(output)),
        info = inspectWav(bytes),
        view = new DataView(bytes.buffer);
      expect(info).toMatchObject({
        sampleRate: 48000,
        channels: 2,
        frames: 96000,
        duration: 2,
      });
      let maximum = 0;
      for (let frame = 0; frame < info.frames; frame++) {
        const time = frame / 48000;
        const expected = Math.max(
          -1,
          Math.min(
            1,
            project.audioTracks.reduce((sum, track) => {
              const gain = audioGainAt(track, time);
              if (!gain) return sum;
              const sample = Math.round(
                (track.sourceStartSeconds + time - track.startSeconds) * 48000,
              );
              return (
                sum + (gain * original.getInt16(44 + sample * 2, true)) / 32768
              );
            }, 0),
          ),
        );
        for (let channel = 0; channel < 2; channel++)
          maximum = Math.max(
            maximum,
            Math.abs(
              expected -
                view.getInt16(
                  info.dataOffset + (frame * 2 + channel) * 2,
                  true,
                ) /
                  32768,
            ),
          );
      }
      expect(maximum).toBeLessThan(0.00008);
    };
    await verify();
    for (const track of project.audioTracks)
      Object.assign(track, {
        startSeconds: 0,
        sourceStartSeconds: 0,
        durationSeconds: 2,
        gain: 2,
        fadeInSeconds: 0,
        fadeOutSeconds: 0,
      });
    await verify();
    project.audioTracks.forEach((track) => {
      track.muted = true;
    });
    expect(audioMixArguments(project, new Map(), output)).toBeNull();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 20000);
