import { useEffect, useRef, useState } from 'react';
import {
  wavBytes,
  type VoiceChoice,
  type VoiceResult,
  type Project,
} from '@animatemap/project-schema';
import { useEditor } from './store';
import { assembleSceneVoice } from './voiceGeneration';
import { NumberField } from './NumberField';

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const body = await res.json();
  if (!res.ok) throw Error(body.error ?? 'Voice request failed');
  return body as T;
}
export function VoiceLibrary() {
  const editor = useEditor(),
    alive = useRef(true),
    stopped = useRef(false),
    cache = useRef(new Map<string, VoiceResult>());
  const [provider, setProvider] = useState('edge'),
    [search, setSearch] = useState(''),
    [choices, setChoices] = useState<VoiceChoice[]>([]),
    [voiceId, setVoiceId] = useState(''),
    [page, setPage] = useState(1),
    [hasMore, setHasMore] = useState(false),
    [speed, setSpeed] = useState(1.08),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [progress, setProgress] = useState('');
  const [replace, setReplace] = useState(
    () =>
      editor.project.audioTracks.find((t) =>
        editor.project.audioAssets
          .find((a) => a.id === t.assetId)
          ?.provenance.source.includes('api.ai33.pro'),
      )?.id ?? '',
  );
  const [pending, setPending] = useState<{
    source: Project;
    project: Project;
    credits: number;
  } | null>(null);
  const [preview, setPreview] = useState('');
  const [shortSample, setShortSample] = useState<VoiceResult | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stopped.current = true;
      void fetch('/api/voice/cancel', { method: 'POST' });
    };
  }, []);
  useEffect(() => {
    if (!pending) {
      setPreview('');
      return;
    }
    const bytes = wavBytes(pending.project.audioAssets.at(-1)!.dataUrl),
      url = URL.createObjectURL(
        new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'audio/wav' }),
      );
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pending]);
  async function load(next = 1) {
    setLoading(true);
    setError('');
    try {
      const result = await api<{
        voices: VoiceChoice[];
        pagination: { has_more?: boolean } | null;
      }>(
        '/api/voice/voices?' +
          new URLSearchParams({ provider, search, page: String(next) }),
      );
      if (alive.current) {
        setChoices(result.voices);
        setVoiceId(result.voices[0]?.id ?? '');
        setPage(next);
        setHasMore(result.pagination?.has_more ?? false);
      }
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      if (alive.current) setLoading(false);
    }
  }
  async function generate() {
    const source = useEditor.getState().project;
    setError('');
    setPending(null);
    stopped.current = false;
    setBusy(true);
    useEditor.setState({ playing: false });
    try {
      if (source.audioTracks.find((t) => t.id === replace)?.locked)
        throw Error('Unlock the selected voice track first');
      if (source.captions.cues.some((c) => c.locked))
        throw Error('Unlock captions first');
      const scenes = source.scenes
        .map((scene) => ({
          scene,
          cues: source.captions.cues.filter(
            (c) =>
              c.startSeconds >= scene.startSeconds &&
              c.startSeconds < scene.startSeconds + scene.durationSeconds,
          ),
        }))
        .filter((s) => s.cues.length);
      if (!scenes.length)
        throw Error('Add captions containing the narration script first');
      const clips: { sceneId: string; result: VoiceResult }[] = [];
      let credits = 0;
      for (const { scene, cues } of scenes) {
        if (stopped.current)
          throw Error('Generation stopped. Existing voice is preserved.');
        if (
          cues.some(
            (c) =>
              c.endSeconds > scene.startSeconds + scene.durationSeconds + 1e-6,
          )
        )
          throw Error(
            'Split captions at scene boundaries before generating scene-aligned voice',
          );
        setProgress(
          `Generating scene ${clips.length + 1}/${scenes.length} · ${scene.name}`,
        );
        const body = {
            provider,
            voiceId,
            speed,
            text: cues.map((c) => c.text).join(' '),
          },
          key = JSON.stringify(body);
        let result = cache.current.get(key);
        if (!result) {
          result = await api<VoiceResult>('/api/voice/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          cache.current.set(key, result);
          credits += result.creditCost;
        }
        clips.push({ sceneId: scene.id, result });
      }
      if (stopped.current)
        throw Error('Generation stopped. Existing voice is preserved.');
      const project = assembleSceneVoice(source, clips, replace);
      if (alive.current) setPending({ source, project, credits });
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      if (alive.current) {
        setBusy(false);
        setProgress('');
      }
    }
  }
  async function generateSample() {
    setBusy(true);
    setError('');
    setProgress('Generating a short voice sample…');
    try {
      const sample = await api<VoiceResult>('/api/voice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          voiceId,
          speed,
          text: 'Xin chào, đây là giọng đọc cho video bản đồ của bạn.',
        }),
      });
      if (alive.current) setShortSample(sample);
    } catch (error) {
      if (alive.current) setError((error as Error).message);
    } finally {
      if (alive.current) {
        setBusy(false);
        setProgress('');
      }
    }
  }
  const selected = choices.find((v) => v.id === voiceId);
  return (
    <section aria-label="AI33 voice selection">
      <h3>AI33 · Choose a Vietnamese voice</h3>
      <label className="field">
        Provider
        <select
          aria-label="Voice provider"
          disabled={busy || loading}
          value={provider}
          onChange={(e) => {
            setShortSample(null);
            setProvider(e.target.value);
            setChoices([]);
            setVoiceId('');
          }}
        >
          {['edge', 'vbee', 'minimax', 'elevenlabs', 'fishaudio', 'kokoro'].map(
            (p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ),
          )}
        </select>
      </label>
      <label className="field">
        Search voice
        <input
          aria-label="Search voice"
          value={search}
          disabled={busy || loading}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <button disabled={busy || loading} onClick={() => void load()}>
        {loading ? 'Loading voices…' : 'Load Vietnamese voices'}
      </button>
      {choices.length > 0 && (
        <>
          <label className="field">
            Voice
            <select
              aria-label="AI33 voice"
              disabled={busy}
              value={voiceId}
              onChange={(e) => {
                setVoiceId(e.target.value);
                setShortSample(null);
              }}
            >
              {choices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} · {v.gender} · {v.locale}
                </option>
              ))}
            </select>
          </label>
          {selected?.preview ? (
            <audio
              key={voiceId}
              aria-label="Voice sample"
              controls
              preload="none"
              src={'/api/voice/sample?' + new URLSearchParams({ id: voiceId })}
            />
          ) : (
            <p>A built-in sample is unavailable for this voice.</p>
          )}
          <div>
            <button
              disabled={busy || loading || page <= 1}
              onClick={() => void load(page - 1)}
            >
              Previous voices
            </button>
            <button
              disabled={busy || loading || !hasMore}
              onClick={() => void load(page + 1)}
            >
              More voices
            </button>
          </div>
        </>
      )}
      <NumberField
        label="Voice speed"
        value={speed}
        min={0.5}
        max={1.5}
        step={0.01}
        onChange={setSpeed}
      />
      {voiceId && (
        <>
          <button disabled={busy} onClick={() => void generateSample()}>
            Generate short sample · uses credits
          </button>
          {shortSample && (
            <div>
              <audio
                aria-label="Generated short voice sample"
                controls
                src={shortSample.dataUrl}
              />
              <p>
                {shortSample.creditCost} credits reported for this sample.
                Existing project audio is unchanged.
              </p>
            </div>
          )}
        </>
      )}
      <label className="field">
        Voice track to replace
        <select
          aria-label="Voice track to replace"
          disabled={busy}
          value={replace}
          onChange={(e) => setReplace(e.target.value)}
        >
          <option value="">Add a new voice track</option>
          {editor.project.audioTracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.locked ? ' · locked' : ''}
            </option>
          ))}
        </select>
      </label>
      <p className="hint">
        Listen to provider samples, then generate from the captions in each
        scene. Generation uses AI33 credits. Camera timing stays fixed; speech
        that does not fit a scene is reported. The existing voice is replaced
        only after you review and apply.
      </p>
      <button disabled={busy || !voiceId} onClick={() => void generate()}>
        {busy ? 'Generating voice…' : 'Generate video voice from captions'}
      </button>
      {busy && (
        <>
          <p role="status">{progress}</p>
          <button
            onClick={() => {
              stopped.current = true;
              void fetch('/api/voice/cancel', { method: 'POST' });
            }}
          >
            Stop waiting for voice
          </button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {pending && (
        <section aria-label="Review generated voice">
          <p>
            Voice ready · {pending.credits} credits reported for these requests
            · karaoke timestamps included
          </p>
          <audio controls src={preview} aria-label="Generated voice preview" />
          <button
            disabled={busy}
            onClick={() => {
              if (useEditor.getState().project !== pending.source) {
                setError(
                  'Project changed during generation; generate again to review against the latest timeline. Cached completed scenes are reused.',
                );
                return;
              }
              editor.edit((p) => {
                p.audioAssets = pending.project.audioAssets;
                p.audioTracks = pending.project.audioTracks;
                p.captions = pending.project.captions;
              });
              setPending(null);
            }}
          >
            Apply reviewed voice and karaoke
          </button>
          <button onClick={() => setPending(null)}>
            Discard generated voice
          </button>
        </section>
      )}
    </section>
  );
}
