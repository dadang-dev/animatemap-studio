import { useEffect, useRef, useState } from 'react';
import {
  admin1Files,
  countryCatalog,
  ADMIN1_RELEASE,
  type Admin1Regions,
  type Admin1Properties,
} from '@animatemap/project-schema';
import type { MapRenderer } from '@animatemap/map-engine';
import { useEditor } from './store';
import { addAdmin1Highlight, focusAdmin1Region } from './admin1Operations';

export function Admin1Panel({
  country,
  initialRegion,
  sceneId,
  renderer,
  onCountry,
  onSelect,
  onClose,
}: {
  country: string;
  initialRegion?: string;
  sceneId: string;
  renderer: MapRenderer | null;
  onCountry: (country: string) => void;
  onSelect: (properties: Admin1Properties) => void;
  onClose: () => void;
}) {
  const editor = useEditor(),
    dialog = useRef<HTMLDialogElement>(null);
  const [regions, setRegions] = useState<Admin1Regions['features']>([]);
  const [selection, setSelection] = useState<string[]>(
    initialRegion ? [initialRegion] : [],
  );
  const [query, setQuery] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const enabled = editor.project.map.admin1Countries.includes(country);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  useEffect(() => {
    let active = true;
    setRegions([]);
    setError('');
    setBusy(true);
    void Promise.resolve()
      .then(() => renderer?.ready())
      .then(() => {
        if (active && renderer)
          setRegions(renderer.regionsForCountry(country)?.features ?? []);
      })
      .catch((error: unknown) => {
        if (active)
          setError(
            error instanceof Error ? error.message : 'Admin 1 loading failed',
          );
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    if (!renderer) setBusy(false);
    return () => {
      active = false;
    };
  }, [renderer, country, editor.project]);
  const selected = regions.filter((region) =>
    selection.includes(region.properties.code),
  );
  return (
    <dialog
      ref={dialog}
      className="template-dialog admin1-dialog"
      aria-labelledby="admin1-title"
      onCancel={onClose}
    >
      <header className="template-header">
        <div>
          <h2 id="admin1-title">Admin 1 regions</h2>
          <p>
            Natural Earth reference release {ADMIN1_RELEASE} · Public domain
          </p>
        </div>
        <button onClick={onClose}>Close regions</button>
      </header>
      <p className="hint">
        Reference boundaries; administrative names/divisions may have changed.
        Geometry follows Natural Earth's source perspective.
      </p>
      {error && <p role="alert">{error}</p>}
      <label className="field">
        Country
        <select
          aria-label="Admin 1 country"
          value={country}
          onChange={(event) => {
            onCountry(event.target.value);
            setSelection([]);
            setQuery('');
          }}
        >
          {countryCatalog.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name} · {item.code}
            </option>
          ))}
        </select>
      </label>
      {!admin1Files.has(country) ? (
        <p role="status">No Admin 1 coverage for {country} in this release.</p>
      ) : (
        <>
          <label className="field">
            <input
              type="checkbox"
              aria-label="Show Admin 1 boundaries"
              checked={enabled}
              onChange={(event) =>
                editor.edit((project) => {
                  project.map.admin1Countries = event.target.checked
                    ? [...project.map.admin1Countries, country]
                    : project.map.admin1Countries.filter(
                        (code) => code !== country,
                      );
                })
              }
            />
            Show {country} boundaries in preview/export
          </label>
          <p className="hint">
            Up to eight countries per project, including region highlights.
            Unchecking outlines keeps highlighted regions.
          </p>
          {busy ? (
            <p role="status">Loading verified Admin 1 geography…</p>
          ) : !regions.length ? (
            <p role="status">
              Enable boundaries to load this country's reference regions.
            </p>
          ) : (
            <>
              <label className="field">
                Search regions
                <input
                  aria-label="Search Admin 1 regions"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Name, local name or source code"
                />
              </label>
              <p>
                {regions.length} reference regions · {selection.length} selected
              </p>
              <div className="admin1-list">
                {regions
                  .filter((region) =>
                    [
                      region.properties.name,
                      region.properties.localName,
                      region.properties.sourceCode,
                      region.properties.isoCode,
                    ].some((value) =>
                      value?.toLowerCase().includes(query.trim().toLowerCase()),
                    ),
                  )
                  .map((region) => (
                    <label
                      key={region.properties.code}
                      className="admin1-option"
                    >
                      <input
                        type="checkbox"
                        aria-label={`Select region ${region.properties.name}`}
                        checked={selection.includes(region.properties.code)}
                        onChange={(event) => {
                          setSelection(
                            event.target.checked
                              ? [...selection, region.properties.code]
                              : selection.filter(
                                  (code) => code !== region.properties.code,
                                ),
                          );
                          onSelect(region.properties);
                        }}
                      />
                      <span>
                        {region.properties.name}
                        <small>
                          {region.properties.localName} ·{' '}
                          {region.properties.type} ·{' '}
                          {region.properties.sourceCode}
                        </small>
                      </span>
                    </label>
                  ))}
              </div>
              {selected.length === 1 && (
                <button
                  onClick={() => {
                    useEditor.setState({
                      camera: focusAdmin1Region(selected[0]!, editor.camera),
                      playing: false,
                    });
                    onClose();
                  }}
                >
                  Focus selected region
                </button>
              )}
              <button
                disabled={!selected.length}
                onClick={() => {
                  const before = useEditor.getState().project;
                  let id = '';
                  editor.edit((project) => {
                    id = addAdmin1Highlight(project, sceneId, selected);
                  });
                  if (useEditor.getState().project === before) {
                    setError(
                      useEditor.getState().error ||
                        'Region highlight was not added',
                    );
                    return;
                  }
                  useEditor.setState({
                    selected: id,
                    playing: false,
                    tool: 'select',
                    points: [],
                  });
                  onClose();
                }}
              >
                Highlight selected regions
              </button>
            </>
          )}
        </>
      )}
    </dialog>
  );
}
