import { useRef, useState } from 'react';
import { createDemo, type Project } from '@animatemap/project-schema';
import { useEditor } from './store';
import { api, downloadJSON } from './persistence';
import { TemplateLibrary } from './TemplateLibrary';
export function ProjectMenu() {
  const s = useEditor();
  const [open, setOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const file = useRef<HTMLInputElement>(null);
  async function action(fn: () => Promise<unknown>) {
    try {
      await fn();
    } catch (e) {
      useEditor.setState({
        error: e instanceof Error ? e.message : 'Project operation failed',
      });
    }
  }
  const save = () =>
    action(() =>
      api('/projects', { method: 'POST', body: JSON.stringify(s.project) }),
    );
  return (
    <div className="menu-wrap">
      <button
        onClick={() => {
          setOpen(!open);
          void action(async () => setProjects(await api('/projects')));
        }}
      >
        Project ▾
      </button>
      {open && (
        <div className="project-menu">
          <label className="field">
            Project name
            <input
              aria-label="Project name"
              value={s.project.name}
              onChange={(e) =>
                s.edit((p) => {
                  p.name = e.target.value;
                })
              }
            />
          </label>
          <div className="button-grid">
            <button
              onClick={() => {
                setTemplatesOpen(true);
                setOpen(false);
              }}
            >
              Template library
            </button>
            <button
              onClick={() => {
                const p = createDemo();
                p.id = crypto.randomUUID();
                p.name = 'Untitled map';
                p.scenes[0]!.layers = [];
                p.scenes[0]!.camera.keyframes = [
                  p.scenes[0]!.camera.keyframes[0]!,
                ];
                s.load(p);
              }}
            >
              New project
            </button>
            <button onClick={() => void save()}>Save</button>
            <button
              onClick={() => {
                const p = structuredClone(s.project);
                p.id = crypto.randomUUID();
                p.name += ' copy';
                s.load(p);
                void action(() =>
                  api('/projects', { method: 'POST', body: JSON.stringify(p) }),
                );
              }}
            >
              Save as / Duplicate
            </button>
            <button onClick={() => downloadJSON(s.project, s.project.id)}>
              Export JSON
            </button>
            <button onClick={() => file.current?.click()}>Import JSON</button>
            <button
              onClick={() =>
                void action(async () => {
                  await api(`/projects/${s.project.id}`, { method: 'DELETE' });
                  const p = createDemo();
                  p.id = crypto.randomUUID();
                  p.name = 'Untitled map';
                  p.scenes[0]!.layers = [];
                  s.load(p);
                  setProjects(await api('/projects'));
                })
              }
            >
              Delete saved project
            </button>
            <button onClick={() => s.load(createDemo())}>Travel demo</button>
            <button onClick={() => s.load(createDemo('highlight'))}>
              Highlight demo
            </button>
          </div>
          <div className="panel-heading section-heading">
            OPEN SAVED PROJECT
          </div>
          {projects.length ? (
            projects.map((p) => (
              <button
                className="saved-project"
                key={p.id}
                onClick={() =>
                  void action(async () => {
                    s.load(await api<Project>(`/projects/${p.id}`));
                    setOpen(false);
                  })
                }
              >
                {p.name}
              </button>
            ))
          ) : (
            <p className="hint">No projects saved to the local API yet.</p>
          )}
          <button onClick={() => setOpen(false)}>Close menu</button>
        </div>
      )}
      <input
        ref={file}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f)
            void action(async () => {
              if (f.size > 5 * 1024 * 1024)
                throw new Error('Project exceeds 5 MB');
              s.load(JSON.parse(await f.text()));
            });
          e.target.value = '';
        }}
      />
      {templatesOpen && (
        <TemplateLibrary onClose={() => setTemplatesOpen(false)} />
      )}
    </div>
  );
}
