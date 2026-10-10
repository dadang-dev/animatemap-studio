import { useEffect, useRef, useState } from 'react';
import type { Dataset } from '@animatemap/project-schema';
import { useEditor } from './store';
import {
  mappedDataset,
  suggestedMapping,
  type ColumnMapping,
  type DataTable,
} from './dataImport';
import { readDataFile } from './dataFile';
import {
  addChoropleth,
  datasetReferences,
  deleteUnusedDataset,
} from './datasetOperations';

export function DataLibrary({
  sceneId,
  onClose,
}: {
  sceneId: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const editor = useEditor();
  const [tables, setTables] = useState<DataTable[]>([]),
    [sheet, setSheet] = useState(0);
  const [mapping, setMapping] = useState<ColumnMapping>({
    country: 0,
    year: 1,
    value: 2,
  });
  const [metadata, setMetadata] = useState({
    name: '',
    unit: '',
    provenance: { source: '', author: '', license: '', credit: '' },
  });
  const [review, setReview] = useState<Dataset | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const table = tables[sheet];
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  function add(dataset: Dataset) {
    const before = useEditor.getState().project;
    let selected = '';
    editor.edit((project) => {
      selected = addChoropleth(project, sceneId, dataset);
    });
    const state = useEditor.getState();
    if (state.project === before) {
      setError(state.error || 'Data layer was not added');
      return;
    }
    useEditor.setState({
      selected,
      playing: false,
      tool: 'select',
      points: [],
    });
    onClose();
  }
  return (
    <dialog
      ref={dialog}
      className="template-dialog data-dialog"
      aria-labelledby="data-library-title"
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
    >
      <header className="template-header">
        <div>
          <h2 id="data-library-title">Country data</h2>
          <p>Local CSV/XLSX → reviewed observations → animated choropleth.</p>
        </div>
        <button disabled={busy} onClick={onClose}>
          Close data
        </button>
      </header>
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">Reading bounded workbook…</p>}
      <fieldset disabled={busy}>
        <label className="field">
          CSV / XLSX
          <input
            aria-label="Import country data file"
            type="file"
            accept=".csv,.xlsx"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              setBusy(true);
              setError('');
              setTables([]);
              setReview(null);
              void readDataFile(file)
                .then((tables) => {
                  setTables(tables);
                  setSheet(0);
                  setMapping(suggestedMapping(tables[0]!));
                  setMetadata((metadata) => ({
                    ...metadata,
                    name: file.name.replace(/\.[^.]+$/, '').slice(0, 200),
                  }));
                })
                .catch((error: unknown) =>
                  setError(
                    error instanceof Error
                      ? error.message
                      : 'Data import failed',
                  ),
                )
                .finally(() => setBusy(false));
            }}
          />
        </label>
        <p className="hint">
          5 MiB input; 20 MiB expanded; 10 worksheets; 64 columns; 10000
          observations/project. Use values, not formulas. Countries match exact
          bundled codes/names.
        </p>
        {table && (
          <form
            className="data-import-form"
            onSubmit={(event) => {
              event.preventDefault();
              setError('');
              setReview(null);
              try {
                setReview(mappedDataset(table, mapping, metadata));
              } catch (error) {
                setError(
                  error instanceof Error
                    ? error.message
                    : 'Data validation failed',
                );
              }
            }}
          >
            <label className="field">
              Worksheet
              <select
                aria-label="Data worksheet"
                value={sheet}
                onChange={(event) => {
                  const index = Number(event.target.value);
                  setSheet(index);
                  setMapping(suggestedMapping(tables[index]!));
                  setReview(null);
                }}
              >
                {tables.map((table, index) => (
                  <option key={index} value={index}>
                    {table.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="data-columns">
              {(['country', 'year', 'value'] as const).map((field) => (
                <label className="field" key={field}>
                  {field} column
                  <select
                    aria-label={`Data ${field} column`}
                    value={mapping[field]}
                    onChange={(event) => {
                      setMapping({
                        ...mapping,
                        [field]: Number(event.target.value),
                      });
                      setReview(null);
                    }}
                  >
                    {table.rows[0]!.map((header, index) => (
                      <option key={index} value={index}>
                        {index + 1} · {String(header ?? '(blank)')}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            {(['name', 'unit'] as const).map((field) => (
              <label className="field" key={field}>
                Dataset {field}
                <input
                  aria-label={`Dataset ${field}`}
                  required={field === 'name'}
                  maxLength={field === 'name' ? 200 : 40}
                  value={metadata[field]}
                  onChange={(event) => {
                    setMetadata({ ...metadata, [field]: event.target.value });
                    setReview(null);
                  }}
                />
              </label>
            ))}
            {(['source', 'author', 'license', 'credit'] as const).map(
              (field) => (
                <label className="field" key={field}>
                  Data {field}
                  <input
                    aria-label={`Data ${field}`}
                    required
                    maxLength={
                      field === 'source' ? 500 : field === 'credit' ? 80 : 200
                    }
                    value={metadata.provenance[field]}
                    onChange={(event) => {
                      setMetadata({
                        ...metadata,
                        provenance: {
                          ...metadata.provenance,
                          [field]: event.target.value,
                        },
                      });
                      setReview(null);
                    }}
                  />
                </label>
              ),
            )}
            <button type="submit">Review observations</button>
          </form>
        )}
        {review && (
          <section aria-label="Reviewed data" className="data-review">
            <h3>
              {review.name} · {review.records.length} observations
            </h3>
            <p>
              {new Set(review.records.map((record) => record.countryCode)).size}{' '}
              countries ·{' '}
              {Math.min(...review.records.map((record) => record.year))}–
              {Math.max(...review.records.map((record) => record.year))}
            </p>
            <table>
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Year</th>
                  <th>Value {review.unit}</th>
                </tr>
              </thead>
              <tbody>
                {review.records.slice(0, 12).map((record) => (
                  <tr key={`${record.countryCode}/${record.year}`}>
                    <td>{record.countryCode}</td>
                    <td>{record.year}</td>
                    <td>{record.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="hint">
              First 12 observations shown. Fixed colors span all imported
              values. Year keys animate through this scene; fractional/missing
              years are explicitly interpolated. Values outside each country's
              observed range are missing.
            </p>
            <button onClick={() => add(review)}>Add reviewed choropleth</button>
          </section>
        )}
        <h3>Project datasets</h3>
        {!editor.project.datasets.length && <p>No datasets in this project.</p>}
        {editor.project.datasets.map((dataset) => (
          <article className="template-card" key={dataset.id}>
            <h4>{dataset.name}</h4>
            <p>
              {dataset.records.length} observations ·{' '}
              {dataset.provenance.credit}
            </p>
            <button onClick={() => add(dataset)}>Reuse {dataset.name}</button>
            <button
              disabled={
                datasetReferences(editor.project, dataset.id).length > 0
              }
              onClick={() =>
                editor.edit((project) =>
                  deleteUnusedDataset(project, dataset.id),
                )
              }
            >
              Delete unused {dataset.name}
            </button>
          </article>
        ))}
      </fieldset>
    </dialog>
  );
}
