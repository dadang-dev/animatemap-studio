import { useEffect, useRef, useState } from 'react';
import {
  inspectEmbeddedWav,
  MAX_AUDIO_BYTES,
  type AudioAsset,
  type AudioTrack,
  type CaptionCue,
} from '@animatemap/project-schema';
import { useEditor } from './store';
import { NumberField } from './NumberField';
import { addAudioTrack, importWav, parseCaptions } from './audioOperations';
import { recordingWav } from './voiceover';
import { VoiceLibrary } from './VoiceLibrary';

export function AudioPanel({ onClose }: { onClose: () => void }) {
  const editor = useEditor(),
    dialog = useRef<HTMLDialogElement>(null),
    alive = useRef(true);
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [recording, setRecording] = useState(false);
  const [pending, setPending] = useState<{
    bytes: Uint8Array;
    name: string;
  } | null>(null);
  const [provenance, setProvenance] = useState<AudioAsset['provenance']>({
    source: '',
    author: '',
    license: '',
    credit: '',
  });
  const capture = useRef<{
    recorder: MediaRecorder;
    stream: MediaStream;
    discard: boolean;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const [trackId, setTrackId] = useState(
    editor.project.audioTracks[0]?.id ?? '',
  );
  const track = editor.project.audioTracks.find(
    (track) => track.id === trackId,
  );
  const [cueId, setCueId] = useState(''),
    [cueText, setCueText] = useState('');
  const [cueStart, setCueStart] = useState(0),
    [cueEnd, setCueEnd] = useState(1);
  const [review, setReview] = useState<CaptionCue[]>([]);
  const selectedCue = editor.project.captions.cues.find(
    (cue) => cue.id === cueId,
  );
  useEffect(() => {
    alive.current = true;
    dialog.current?.showModal();
    return () => {
      alive.current = false;
      const owned = capture.current;
      if (owned) {
        owned.discard = true;
        clearTimeout(owned.timer);
        if (owned.recorder.state !== 'inactive') owned.recorder.stop();
        owned.stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);
  const fail = (error: unknown) => {
    if (alive.current)
      setError(
        error instanceof Error ? error.message : 'Audio operation failed',
      );
  };
  function editTrack(change: (track: AudioTrack) => void) {
    editor.edit((project) => {
      const target = project.audioTracks.find((track) => track.id === trackId);
      if (target && !target.locked) change(target);
    });
  }
  async function record() {
    setError('');
    setBusy(true);
    useEditor.setState({ playing: false });
    let stream: MediaStream | undefined;
    let stage = 'microphone access';
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === 'undefined'
      )
        throw new Error('Microphone recording is unavailable in this browser');
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      stage = 'recording codec';
      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/mp4;codecs=mp4a.40.2',
      ].find((type) => MediaRecorder.isTypeSupported(type));
      if (!mimeType)
        throw new Error('This browser has no supported audio recording codec');
      stage = `recorder ${mimeType}`;
      const recorder = new MediaRecorder(stream, { mimeType }),
        chunks: Blob[] = [];
      let size = 0;
      const owned = {
        recorder,
        stream,
        discard: false,
        timer: setTimeout(() => {
          if (recorder.state !== 'inactive') recorder.stop();
        }, 60000),
      };
      capture.current = owned;
      recorder.ondataavailable = (event) => {
        size += event.data.size;
        if (size > MAX_AUDIO_BYTES) {
          owned.discard = true;
          fail(new Error('Recording exceeds 16 MiB'));
          if (recorder.state !== 'inactive') recorder.stop();
        } else chunks.push(event.data);
      };
      recorder.onerror = () => {
        owned.discard = true;
        owned.stream.getTracks().forEach((track) => track.stop());
        clearTimeout(owned.timer);
        if (recorder.state !== 'inactive') recorder.stop();
        fail(new Error('Microphone recording failed'));
        if (alive.current) {
          setBusy(false);
          setRecording(false);
        }
      };
      recorder.onstop = () => {
        clearTimeout(owned.timer);
        owned.stream.getTracks().forEach((track) => track.stop());
        if (capture.current === owned) capture.current = null;
        if (!alive.current) return;
        setRecording(false);
        if (owned.discard) {
          setBusy(false);
          return;
        }
        void recordingWav(new Blob(chunks, { type: recorder.mimeType }))
          .then((bytes) => {
            if (alive.current) setPending({ bytes, name: 'Voiceover' });
          })
          .catch(fail)
          .finally(() => {
            if (alive.current) setBusy(false);
          });
      };
      stage = `starting ${mimeType}`;
      recorder.start(500);
      setRecording(true);
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      fail(
        error instanceof Error
          ? new Error(`Microphone ${stage}: ${error.name}: ${error.message}`)
          : error,
      );
      if (alive.current) setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="template-dialog audio-dialog"
      aria-labelledby="audio-title"
      onCancel={onClose}
    >
      <header className="template-header">
        <div>
          <h2 id="audio-title">Audio, voiceover & captions</h2>
          <p>Project time · Local media · MP4 / WebM audio</p>
        </div>
        <button onClick={onClose}>Close audio</button>
      </header>
      {(error || editor.error) && <p role="alert">{error || editor.error}</p>}
      <VoiceLibrary />
      <p className="hint">
        Import PCM 16-bit WAV, mono/stereo, 8–96 kHz. Maximum 16 MiB per asset /
        32 MiB total. Source rate/channels are preserved. Record up to 60
        seconds; closing this dialog discards unfinished recording and releases
        the microphone.
      </p>
      <label className="field">
        Import WAV
        <input
          aria-label="Import audio file"
          type="file"
          accept=".wav,audio/wav"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            setError('');
            setBusy(true);
            void (async () => {
              if (file.size > MAX_AUDIO_BYTES)
                throw new Error('Audio exceeds 16 MiB');
              const bytes = new Uint8Array(await file.arrayBuffer());
              const asset = importWav(bytes, file.name, provenance);
              if (alive.current) setPending({ bytes, name: asset.name });
            })()
              .catch(fail)
              .finally(() => {
                if (alive.current) setBusy(false);
              });
          }}
        />
      </label>
      {recording ? (
        <>
          <p role="status">Recording locally · maximum 60 seconds</p>
          <button
            onClick={() => {
              if (capture.current?.recorder.state !== 'inactive')
                capture.current?.recorder.stop();
            }}
          >
            Stop recording
          </button>
          <button
            onClick={() => {
              if (capture.current) {
                capture.current.discard = true;
                if (capture.current.recorder.state !== 'inactive')
                  capture.current.recorder.stop();
              }
            }}
          >
            Discard recording
          </button>
        </>
      ) : (
        <button disabled={busy} onClick={() => void record()}>
          Record voiceover
        </button>
      )}
      {busy && !recording && <p role="status">Preparing local audio…</p>}
      {pending && (
        <section aria-label="Review audio import">
          <h3>Review audio: {pending.name}</h3>
          {(['source', 'author', 'license', 'credit'] as const).map((key) => (
            <label className="field" key={key}>
              {key}
              <input
                aria-label={`Audio ${key}`}
                value={provenance[key]}
                onChange={(event) =>
                  setProvenance({ ...provenance, [key]: event.target.value })
                }
              />
            </label>
          ))}
          <button
            disabled={busy}
            onClick={() => {
              const before = editor.project;
              let id = '';
              editor.edit((project) => {
                const asset = importWav(
                  pending.bytes,
                  pending.name,
                  provenance,
                );
                project.audioAssets.push(asset);
                id = addAudioTrack(project, asset.id, editor.time);
              });
              if (useEditor.getState().project !== before) {
                setTrackId(id);
                setPending(null);
                setError('');
              }
            }}
          >
            Add reviewed audio at playhead
          </button>
          <button onClick={() => setPending(null)}>Discard audio import</button>
        </section>
      )}
      <h3>Audio tracks</h3>
      {!editor.project.audioTracks.length && <p>No audio tracks yet.</p>}
      <div className="audio-track-list">
        {editor.project.audioTracks.map((item) => (
          <button
            key={item.id}
            aria-pressed={item.id === trackId}
            onClick={() => setTrackId(item.id)}
          >
            {item.name} · {item.startSeconds.toFixed(2)}–
            {(item.startSeconds + item.durationSeconds).toFixed(2)}s
            {item.muted ? ' · Muted' : ''}
          </button>
        ))}
      </div>
      {track && (
        <section aria-label="Selected audio track">
          <button onClick={() => editor.seek(track.startSeconds)}>
            Seek to audio start
          </button>
          <button
            onClick={() =>
              editor.edit((project) => {
                const item = project.audioTracks.find(
                  (item) => item.id === trackId,
                )!;
                item.locked = !item.locked;
              })
            }
          >
            {track.locked ? 'Unlock audio track' : 'Lock audio track'}
          </button>
          <fieldset disabled={track.locked}>
            <label className="field">
              Name
              <input
                aria-label="Audio track name"
                value={track.name}
                onChange={(event) =>
                  editTrack((item) => {
                    item.name = event.target.value;
                  })
                }
              />
            </label>
            <NumberField
              label="Audio start"
              value={track.startSeconds}
              min={0}
              max={editor.project.durationSeconds}
              onChange={(value) =>
                editTrack((item) => {
                  item.startSeconds = value;
                })
              }
            />
            <NumberField
              label="Audio source offset"
              value={track.sourceStartSeconds}
              min={0}
              onChange={(value) =>
                editTrack((item) => {
                  item.sourceStartSeconds = value;
                })
              }
            />
            <NumberField
              label="Audio duration"
              value={track.durationSeconds}
              min={0.01}
              max={editor.project.durationSeconds}
              onChange={(value) =>
                editTrack((item) => {
                  item.durationSeconds = value;
                })
              }
            />
            <NumberField
              label="Audio gain"
              value={track.gain}
              min={0}
              max={2}
              onChange={(value) =>
                editTrack((item) => {
                  item.gain = value;
                })
              }
            />
            <NumberField
              label="Audio fade in"
              value={track.fadeInSeconds}
              min={0}
              onChange={(value) =>
                editTrack((item) => {
                  item.fadeInSeconds = value;
                })
              }
            />
            <NumberField
              label="Audio fade out"
              value={track.fadeOutSeconds}
              min={0}
              onChange={(value) =>
                editTrack((item) => {
                  item.fadeOutSeconds = value;
                })
              }
            />
            <label className="field">
              <input
                type="checkbox"
                aria-label="Mute audio track"
                checked={track.muted}
                onChange={(event) =>
                  editTrack((item) => {
                    item.muted = event.target.checked;
                  })
                }
              />
              Mute
            </label>
            <button
              onClick={() =>
                editor.edit((project) => {
                  if (!track.locked)
                    project.audioTracks = project.audioTracks.filter(
                      (item) => item.id !== trackId,
                    );
                })
              }
            >
              Delete audio track
            </button>
          </fieldset>
        </section>
      )}
      <h3>Audio library</h3>
      {editor.project.audioAssets.map((asset) => (
        <div className="audio-asset" key={asset.id}>
          <span>
            {asset.name} ·{' '}
            {inspectEmbeddedWav(asset.dataUrl).duration.toFixed(2)}s
          </span>
          <button
            onClick={() => {
              let id = '';
              const before = editor.project;
              editor.edit((project) => {
                id = addAudioTrack(project, asset.id, editor.time);
              });
              if (useEditor.getState().project !== before) setTrackId(id);
            }}
          >
            Add audio track {asset.name}
          </button>
          <button
            disabled={editor.project.audioTracks.some(
              (item) => item.assetId === asset.id,
            )}
            onClick={() =>
              editor.edit((project) => {
                project.audioAssets = project.audioAssets.filter(
                  (item) => item.id !== asset.id,
                );
              })
            }
          >
            Delete unused audio {asset.name}
          </button>
        </div>
      ))}
      <h3>Captions</h3>
      <label className="field">
        <input
          type="checkbox"
          aria-label="Highlight spoken word"
          checked={editor.project.captions.style.wordHighlight ?? false}
          onChange={(event) =>
            editor.edit((project) => {
              project.captions.style.wordHighlight = event.target.checked;
            })
          }
        />
        Karaoke · highlight the spoken word
      </label>
      <label className="field">
        Word highlight color
        <input
          type="color"
          aria-label="Word highlight color"
          value={editor.project.captions.style.highlightColor ?? '#ffe16b'}
          onChange={(event) =>
            editor.edit((project) => {
              project.captions.style.highlightColor = event.target.value;
            })
          }
        />
      </label>
      <p className="hint">
        Karaoke requires real word timestamps. Plain SRT/VTT stays plain; its
        timing is never guessed.
      </p>
      <label className="field">
        <input
          type="checkbox"
          aria-label="Show source footer"
          checked={editor.project.map.creditVisibility !== 'hidden'}
          onChange={(event) =>
            editor.edit((project) => {
              project.map.creditVisibility = event.target.checked
                ? 'full'
                : 'hidden';
            })
          }
        />
        Show source footer · retain required credits in an end card or
        accompanying licence file
      </label>
      <label className="field">
        <input
          type="checkbox"
          aria-label="Show captions"
          checked={editor.project.captions.enabled}
          onChange={(event) =>
            editor.edit((project) => {
              project.captions.enabled = event.target.checked;
            })
          }
        />
        Show captions
      </label>
      <label className="field">
        Import SRT / VTT
        <input
          type="file"
          aria-label="Import captions file"
          accept=".srt,.vtt,text/plain,text/vtt"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            setError('');
            void (async () => {
              if (file.size > 1024 * 1024)
                throw new Error('Caption file exceeds 1 MiB');
              const cues = parseCaptions(
                await file.text(),
                editor.project.durationSeconds,
              );
              if (alive.current) setReview(cues);
            })().catch(fail);
          }}
        />
      </label>
      {!!review.length && (
        <section aria-label="Review caption import">
          <p>
            {review.length} reviewed cues · {review[0]!.text}
          </p>
          <button
            disabled={editor.project.captions.cues.some((cue) => cue.locked)}
            onClick={() => {
              const before = editor.project;
              editor.edit((project) => {
                if (project.captions.cues.some((cue) => cue.locked))
                  throw new Error('Unlock captions before replacing');
                project.captions.cues = review;
              });
              if (useEditor.getState().project !== before) setReview([]);
            }}
          >
            Replace captions with reviewed cues
          </button>
          <button onClick={() => setReview([])}>Discard caption import</button>
        </section>
      )}
      <div className="audio-track-list">
        {editor.project.captions.cues.map((cue, index) => (
          <button
            key={cue.id}
            onClick={() => {
              setCueId(cue.id);
              setCueText(cue.text);
              setCueStart(cue.startSeconds);
              setCueEnd(cue.endSeconds);
            }}
          >
            Caption {index + 1} · {cue.startSeconds.toFixed(2)}–
            {cue.endSeconds.toFixed(2)}s
          </button>
        ))}
      </div>
      <button
        onClick={() => {
          setCueId('');
          setCueText('');
          const start = Math.min(
            editor.time,
            editor.project.durationSeconds - 0.01,
          );
          setCueStart(start);
          setCueEnd(Math.min(editor.project.durationSeconds, start + 2));
        }}
      >
        New caption
      </button>
      {selectedCue && (
        <>
          <button
            onClick={() =>
              editor.edit((project) => {
                const cue = project.captions.cues.find(
                  (cue) => cue.id === cueId,
                )!;
                cue.locked = !cue.locked;
              })
            }
          >
            {selectedCue.locked ? 'Unlock caption' : 'Lock caption'}
          </button>
          <button
            disabled={selectedCue.locked}
            onClick={() =>
              editor.edit((project) => {
                project.captions.cues = project.captions.cues.filter(
                  (cue) => cue.id !== cueId,
                );
              })
            }
          >
            Delete caption
          </button>
        </>
      )}
      <fieldset disabled={selectedCue?.locked}>
        <NumberField
          label="Caption start"
          value={cueStart}
          min={0}
          max={editor.project.durationSeconds}
          onChange={setCueStart}
        />
        <NumberField
          label="Caption end"
          value={cueEnd}
          min={0}
          max={editor.project.durationSeconds}
          onChange={setCueEnd}
        />
        <label className="field">
          Text
          <textarea
            aria-label="Caption text"
            value={cueText}
            maxLength={1000}
            onChange={(event) => setCueText(event.target.value)}
          />
        </label>
        <button
          onClick={() => {
            editor.edit((project) => {
              const cue = project.captions.cues.find((cue) => cue.id === cueId);
              if (cue?.locked) return;
              const next = {
                id: cue?.id ?? crypto.randomUUID(),
                startSeconds: cueStart,
                endSeconds: cueEnd,
                text: cueText,
                locked: false,
                ...(cue?.words &&
                cue.text === cueText &&
                cue.startSeconds === cueStart &&
                cue.endSeconds === cueEnd
                  ? { words: cue.words }
                  : {}),
              };
              project.captions.cues = [
                ...project.captions.cues.filter((item) => item.id !== cueId),
                next,
              ].sort((a, b) => a.startSeconds - b.startSeconds);
            });
          }}
        >
          Apply caption
        </button>
      </fieldset>
      <NumberField
        label="Caption font size"
        value={editor.project.captions.style.fontSize}
        min={12}
        max={120}
        onChange={(value) =>
          editor.edit((project) => {
            project.captions.style.fontSize = value;
          })
        }
      />
      <NumberField
        label="Caption vertical position"
        value={editor.project.captions.style.y}
        min={0}
        max={1}
        step={0.01}
        onChange={(value) =>
          editor.edit((project) => {
            project.captions.style.y = value;
          })
        }
      />
      <label className="field">
        Color
        <input
          type="color"
          aria-label="Caption color"
          value={editor.project.captions.style.color}
          onChange={(event) =>
            editor.edit((project) => {
              project.captions.style.color = event.target.value;
            })
          }
        />
      </label>
      <label className="field">
        Background
        <input
          type="color"
          aria-label="Caption background"
          value={editor.project.captions.style.background}
          onChange={(event) =>
            editor.edit((project) => {
              project.captions.style.background = event.target.value;
            })
          }
        />
      </label>
      <p className="hint">
        Tracks and captions use project seconds and retain timing across scene
        crossfades. Overlapping audio sums with hard clipping at ±1. GIF/PNG
        contain captions and source credits; audio is included only in MP4/WebM.
      </p>
    </dialog>
  );
}
