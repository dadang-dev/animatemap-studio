import { useEffect, useRef, useState } from 'react';
import {
  builtInTemplates,
  instantiateTemplate,
  savedTemplate,
  type Template,
} from './templates';
import {
  readTemplates,
  addTemplate,
  deleteTemplate,
} from './templateRepository';
import { useEditor } from './store';

export function TemplateLibrary({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const project = useEditor((state) => state.project);
  const [custom, setCustom] = useState<Template[]>([]);
  const [query, setQuery] = useState('');
  const [name, setName] = useState(project.name);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    dialog.current?.showModal();
    let alive = true;
    void readTemplates()
      .then((templates) => {
        if (alive) {
          setCustom(templates);
          setLoaded(true);
        }
      })
      .catch((error: unknown) => {
        if (alive)
          setError(
            error instanceof Error
              ? error.message
              : 'Template storage unavailable',
          );
      });
    return () => {
      alive = false;
    };
  }, []);
  async function save(operation: () => Promise<Template[]>) {
    setBusy(true);
    setError('');
    try {
      setCustom(await operation());
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Template save failed');
    } finally {
      setBusy(false);
    }
  }
  const visible = [...builtInTemplates, ...custom].filter((template) =>
    `${template.name} ${template.description} ${template.category}`
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase()),
  );
  return (
    <dialog
      ref={dialog}
      className="template-dialog"
      aria-labelledby="template-library-title"
      onCancel={onClose}
    >
      <header className="template-header">
        <div>
          <h2 id="template-library-title">Template library</h2>
          <p>Start with an editable map story. Everything runs locally.</p>
        </div>
        <button onClick={onClose}>Close templates</button>
      </header>
      {error && <p role="alert">{error}</p>}
      <label className="field">
        Find a template
        <input
          aria-label="Find a template"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="template-grid">
        {visible.map((template) => (
          <article className="template-card" key={template.id}>
            <span className="badge">{template.category}</span>
            <h3>{template.name}</h3>
            <p>{template.description}</p>
            <p className="template-spec">
              {template.project.canvas.width} × {template.project.canvas.height}{' '}
              · {template.project.durationSeconds}s ·{' '}
              {template.project.scenes.length} scene
              {template.project.scenes.length > 1 ? 's' : ''}
            </p>
            <div className="scene-controls">
              <button
                aria-label={`Use template ${template.name}`}
                onClick={() => {
                  try {
                    useEditor
                      .getState()
                      .applyTemplate(instantiateTemplate(template));
                    onClose();
                  } catch (error) {
                    setError(
                      error instanceof Error
                        ? error.message
                        : 'Template could not be opened',
                    );
                  }
                }}
              >
                Create project
              </button>
              {template.category === 'Saved' && (
                <button
                  disabled={busy}
                  aria-label={`Delete template ${template.name}`}
                  onClick={() => void save(() => deleteTemplate(template.id))}
                >
                  Delete
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {!visible.length && <p>No templates match this search.</p>}
      <form
        className="template-save"
        onSubmit={(event) => {
          event.preventDefault();
          try {
            void save(() => addTemplate(savedTemplate(name, project)));
          } catch (error) {
            setError(
              error instanceof Error ? error.message : 'Invalid template',
            );
          }
        }}
      >
        <label className="field">
          Save current project as a template
          <input
            aria-label="Saved template name"
            value={name}
            maxLength={200}
            required
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <button type="submit" disabled={!loaded || busy || custom.length >= 30}>
          Save current as template
        </button>
        <p className="hint">
          {loaded
            ? `${custom.length}/30 saved on this device`
            : error
              ? 'Saved library unavailable'
              : 'Loading saved templates…'}{' '}
          · New template projects support Undo.
        </p>
      </form>
    </dialog>
  );
}
