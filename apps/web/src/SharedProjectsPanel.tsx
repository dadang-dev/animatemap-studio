import { useEffect, useRef, useState } from 'react';
import {
  accountSchema,
  sharedDocumentSchema,
  type Account,
  type SharedDocument,
} from '@animatemap/project-schema/collaboration';
import { useEditor } from './store';
import { useSharedConnection } from './sharedConnection';
type Summary = {
  id: string;
  name: string;
  revision: number;
  role: 'owner' | 'editor' | 'viewer';
};
export function SharedProjectsPanel({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null),
    alive = useRef(true),
    generation = useRef(0);
  const [account, setAccount] = useState<Account | null>(null),
    [username, setUsername] = useState(''),
    [password, setPassword] = useState('');
  const [documents, setDocuments] = useState<Summary[]>([]),
    [conflict, setConflict] = useState<SharedDocument | null>(null);
  const connection = useSharedConnection(),
    document = connection.document,
    setDocument = connection.select;
  const [member, setMember] = useState(''),
    [role, setRole] = useState<'editor' | 'viewer'>('viewer'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const membership = document?.members.find(
    (member) => member.id === account?.id,
  );
  async function request(path: string, options?: RequestInit) {
    const response = await fetch(`/api/shared${path}`, {
      ...options,
      headers: {
        ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
        ...options?.headers,
      },
      credentials: 'same-origin',
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 409 && result.document)
        setConflict(sharedDocumentSchema.parse(result.document));
      if (response.status === 401) {
        setAccount(null);
        setDocuments([]);
      }
      throw Object.assign(
        new Error(result.error ?? `Shared request failed (${response.status})`),
        { statusCode: response.status },
      );
    }
    return result;
  }
  async function refresh() {
    const items = await request('/projects');
    if (alive.current) setDocuments(items);
  }
  async function action(operation: () => Promise<void>) {
    const token = ++generation.current;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await operation();
    } catch (error) {
      if (alive.current && token === generation.current)
        setError(
          error instanceof Error ? error.message : 'Shared operation failed',
        );
    } finally {
      if (alive.current && token === generation.current) setBusy(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    dialog.current?.showModal();
    void action(async () => {
      try {
        const session = await request('/session');
        if (alive.current) {
          setAccount(accountSchema.parse(session.account));
          connection.account(session.account.id);
          await refresh();
        }
      } catch (error) {
        if ((error as Error & { statusCode?: number }).statusCode !== 401)
          throw error;
      }
    });
    return () => {
      alive.current = false;
      generation.current++;
    };
    // Initial session lookup only; subsequent requests are explicit actions.
  }, []);
  async function signIn(register: boolean) {
    const supplied = password;
    setPassword('');
    await action(async () => {
      const result = await request(register ? '/register' : '/login', {
        method: 'POST',
        body: JSON.stringify({ username, password: supplied }),
      });
      if (!alive.current) return;
      setAccount(accountSchema.parse(result.account));
      connection.account(result.account.id);
      setConflict(null);
      await refresh();
    });
  }
  function loadServer(current: SharedDocument) {
    const previous = useEditor.getState().project;
    useEditor
      .getState()
      .edit((project) =>
        Object.assign(project, structuredClone(current.project)),
      );
    const next = useEditor.getState();
    if (
      next.error ||
      (next.project === previous &&
        JSON.stringify(previous) !== JSON.stringify(current.project))
    )
      throw new Error(next.error || 'Server project could not be loaded');
    next.seek(0);
    useEditor.setState({
      selected: current.project.scenes[0]!.layers[0]?.id ?? '',
      playing: false,
      tool: 'select',
      points: [],
    });
    setDocument(current);
    setConflict(null);
    setMessage(
      `Loaded server revision ${current.revision}; Undo restores the previous local project`,
    );
  }
  async function saveCopy() {
    const snapshot = structuredClone(useEditor.getState().project);
    await action(async () => {
      const created = sharedDocumentSchema.parse(
        await request('/projects', {
          method: 'POST',
          body: JSON.stringify(snapshot),
        }),
      );
      if (!alive.current) return;
      setDocument(created);
      setConflict(null);
      setMessage(
        'Saved an independent shared copy; local project remains intact',
      );
      await refresh();
    });
  }
  async function save() {
    if (!document) return;
    const snapshot = structuredClone(useEditor.getState().project),
      original = document;
    await action(async () => {
      const saved = sharedDocumentSchema.parse(
        await request(`/projects/${original.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            revision: original.revision,
            project: snapshot,
          }),
        }),
      );
      if (!alive.current) return;
      setDocument(saved);
      setConflict(null);
      setMessage(`Saved revision ${saved.revision}`);
      await refresh();
    });
  }
  async function members(username: string, role: 'editor' | 'viewer' | null) {
    if (!document) return;
    const original = document;
    await action(async () => {
      const updated = sharedDocumentSchema.parse(
        await request(`/projects/${original.id}/members`, {
          method: 'PUT',
          body: JSON.stringify({ revision: original.revision, username, role }),
        }),
      );
      if (!alive.current) return;
      setDocument(updated);
      setMember('');
      setMessage('Membership updated');
      await refresh();
    });
  }
  return (
    <dialog
      ref={dialog}
      className="template-dialog"
      aria-label="Shared projects"
      onCancel={onClose}
    >
      <header className="template-header">
        <h2>Shared projects</h2>
        <button onClick={onClose}>Close shared projects</button>
      </header>
      <p>
        Authenticated snapshots on this application's local server. Public cloud
        hosting is not configured. Local editing and export remain available
        without signing in.
      </p>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <fieldset disabled={busy}>
        {!account ? (
          <>
            <label className="field">
              Account name
              <input
                aria-label="Shared account name"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
            <label className="field">
              Password
              <input
                aria-label="Shared account password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <p>
              Use 12–128 characters. Credentials stay outside project JSON and
              autosave.
            </p>
            <button onClick={() => void signIn(false)}>Sign in</button>
            <button onClick={() => void signIn(true)}>
              Register local account
            </button>
          </>
        ) : (
          <>
            <p>
              Signed in as <strong>{account.username}</strong>
            </p>
            <button
              onClick={() =>
                void action(async () => {
                  await request('/logout', { method: 'POST' });
                  if (alive.current) {
                    setAccount(null);
                    connection.account(null);
                    setDocuments([]);
                    setDocument(null);
                    setConflict(null);
                  }
                })
              }
            >
              Sign out
            </button>
            <button onClick={() => void action(refresh)}>
              Refresh shared projects
            </button>
            <button onClick={() => void saveCopy()}>
              Save local project as shared copy
            </button>
            <ul>
              {documents.map((item) => (
                <li key={item.id}>
                  <span>
                    {item.name} · revision {item.revision} · {item.role}
                  </span>
                  <button
                    aria-label={`Open shared ${item.name}`}
                    onClick={() =>
                      void action(async () => {
                        const current = sharedDocumentSchema.parse(
                          await request(`/projects/${item.id}`),
                        );
                        if (alive.current) loadServer(current);
                      })
                    }
                  >
                    Open server project
                  </button>
                </li>
              ))}
            </ul>
            {document && (
              <section>
                <h3>Selected: {document.project.name}</h3>
                <p>
                  Loaded revision {document.revision} · {membership?.role}
                </p>
                <button
                  disabled={membership?.role === 'viewer' || !!conflict}
                  onClick={() => void save()}
                >
                  Save shared revision
                </button>
                <p>
                  Save captures the current local project. Refresh lists
                  revisions; opening a server project explicitly replaces local
                  editing state and supports Undo.
                </p>
                <ul>
                  {document.members.map((item) => (
                    <li key={item.id}>
                      {item.username} · {item.role}
                      {membership?.role === 'owner' &&
                        item.role !== 'owner' && (
                          <button
                            aria-label={`Revoke shared ${item.username}`}
                            onClick={() => void members(item.username, null)}
                          >
                            Revoke
                          </button>
                        )}
                    </li>
                  ))}
                </ul>
                {membership?.role === 'owner' && (
                  <>
                    <label className="field">
                      Collaborator account
                      <input
                        aria-label="Collaborator account name"
                        value={member}
                        onChange={(event) => setMember(event.target.value)}
                      />
                    </label>
                    <label className="field">
                      Role
                      <select
                        aria-label="Collaborator role"
                        value={role}
                        onChange={(event) =>
                          setRole(event.target.value as 'editor' | 'viewer')
                        }
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                      </select>
                    </label>
                    <button onClick={() => void members(member, role)}>
                      Grant shared access
                    </button>
                    <button
                      onClick={() =>
                        void action(async () => {
                          await request(`/projects/${document.id}`, {
                            method: 'DELETE',
                            body: JSON.stringify({
                              revision: document.revision,
                            }),
                          });
                          if (alive.current) {
                            setDocument(null);
                            setConflict(null);
                            setMessage(
                              'Shared document deleted; local project is intact',
                            );
                            await refresh();
                          }
                        })
                      }
                    >
                      Delete selected shared document
                    </button>
                  </>
                )}
              </section>
            )}
            {conflict && (
              <section aria-label="Shared revision conflict">
                <h3>
                  Server revision {conflict.revision} conflicts with this draft
                </h3>
                <p>
                  Your local draft is intact. Choose an explicit recovery; there
                  is no automatic merge or forced overwrite.
                </p>
                <button
                  onClick={() => {
                    try {
                      loadServer(conflict);
                    } catch (error) {
                      setError(
                        error instanceof Error ? error.message : 'Load failed',
                      );
                    }
                  }}
                >
                  Load conflict server revision
                </button>
                <button onClick={() => void saveCopy()}>
                  Keep draft as separate shared copy
                </button>
              </section>
            )}
          </>
        )}
      </fieldset>
      {busy && <p role="status">Working with shared storage…</p>}
    </dialog>
  );
}
