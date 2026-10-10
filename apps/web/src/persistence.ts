import { get, set } from 'idb-keyval';
import { useEffect, useState } from 'react';
import { useEditor } from './store';
export function useAutosave() {
  const project = useEditor((s) => s.project);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Restoring…');
  useEffect(() => {
    let alive = true;
    void get('animatemap.autosave.v1')
      .then((value) => {
        if (!alive) return;
        if (value) useEditor.getState().load(value);
        setReady(true);
        setStatus('Saved locally');
      })
      .catch(() => {
        if (alive) {
          setReady(true);
          setStatus('Autosave unavailable');
        }
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    setStatus('Saving…');
    const timer = setTimeout(() => {
      void set('animatemap.autosave.v1', project)
        .then(() => setStatus('Saved locally'))
        .catch(() => setStatus('Autosave failed · use Save JSON'));
    }, 300);
    return () => clearTimeout(timer);
  }, [project, ready]);
  return status;
}
export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!response.ok)
    throw new Error(
      ((await response.json()) as { error?: string }).error ??
        `Request failed (${response.status})`,
    );
  return (await response.json()) as T;
}
export function downloadJSON(project: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
