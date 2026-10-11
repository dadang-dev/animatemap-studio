import { useEffect, useRef, useState } from 'react';
import {
  geocodeResponseSchema,
  roadRouteResultSchema,
  directionsRequestSchema,
  type PlaceResult,
  type RoadRouteResult,
} from '@animatemap/project-schema';
import { api } from './persistence';
import { useEditor } from './store';
import { addGeographicLayer } from './geographyOperations';

type Status = {
  configured: boolean;
  busy: boolean;
  quota: {
    perMinute: number;
    perDay: number;
    usedMinute: number;
    usedDay: number;
  };
  retryAfterSeconds: number;
};
export function GeographyPanel({
  sceneId,
  onClose,
}: {
  sceneId: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    controller = useRef<AbortController | null>(null);
  const [status, setStatus] = useState<Status | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState<
      'natural-earth' | 'openrouteservice'
    >('natural-earth'),
    [query, setQuery] = useState(''),
    [results, setResults] = useState<PlaceResult[]>([]),
    [chosen, setChosen] = useState<PlaceResult | null>(null);
  const [points, setPoints] = useState<PlaceResult[]>([]),
    [route, setRoute] = useState<RoadRouteResult | null>(null),
    [profile, setProfile] = useState<
      'driving-car' | 'cycling-regular' | 'foot-walking'
    >('driving-car');
  const [key, setKey] = useState(''),
    [terms, setTerms] = useState(false),
    [minute, setMinute] = useState(10),
    [day, setDay] = useState(100);
  const editor = useEditor();
  useEffect(() => {
    dialog.current?.showModal();
    let active = true;
    void api<Status>('/geography/status')
      .then((value) => {
        if (active) setStatus(value);
      })
      .catch((e: unknown) => {
        if (active)
          setError(
            e instanceof Error ? e.message : 'Provider status unavailable',
          );
      });
    return () => {
      active = false;
      controller.current?.abort();
    };
  }, []);
  const cancel = () => {
    controller.current?.abort();
    void api('/geography/cancel', { method: 'POST' }).catch(() => undefined);
  };
  const run = async (path: string, body?: unknown, method = 'POST') => {
    const owned = new AbortController();
    controller.current?.abort();
    controller.current = owned;
    setBusy(true);
    setError('');
    try {
      const value = await api<unknown>(path, {
        method,
        signal: owned.signal,
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (owned.signal.aborted) return;
      setStatus(
        await api<Status>('/geography/status', { signal: owned.signal }),
      );
      return value;
    } catch (e) {
      if (!owned.signal.aborted)
        setError(e instanceof Error ? e.message : 'Geography request failed');
    } finally {
      if (controller.current === owned) {
        controller.current = null;
        setBusy(false);
      }
    }
  };
  const apply = (
    kind: 'place' | 'road-route',
    value: PlaceResult | RoadRouteResult,
  ) => {
    let id = '';
    editor.edit((p) => {
      id = addGeographicLayer(p, sceneId, value, kind);
    });
    if (!useEditor.getState().error)
      useEditor.setState({ selected: id, tool: 'select', points: [] });
  };
  const close = () => {
    cancel();
    onClose();
  };
  return (
    <dialog
      ref={dialog}
      className="template-dialog geography-dialog"
      aria-labelledby="geography-title"
      onCancel={close}
    >
      <header className="template-header">
        <h2 id="geography-title">Places & road routes</h2>
        <button aria-label="Close geography" onClick={close}>
          Close
        </button>
      </header>
      <p>
        Review a result before adding it. Accepted coordinates and source
        metadata stay in the project; playback and exports make no provider
        requests.
      </p>
      <fieldset disabled={busy}>
        <legend>Find a place</legend>
        <label>
          Search provider
          <select
            aria-label="Search provider"
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value as typeof provider);
              setResults([]);
              setChosen(null);
            }}
          >
            <option value="natural-earth">
              Offline cities · Natural Earth v5.1.2
            </option>
            <option value="openrouteservice">
              Openrouteservice · OSM places/addresses
            </option>
          </select>
        </label>
        <p>
          Offline search covers 7,342 release-reference populated places,
          including Unicode names. Street addresses require a configured
          service.
        </p>
        <label>
          Place name
          <input
            aria-label="Place name"
            value={query}
            maxLength={150}
            onChange={(e) => {
              setQuery(e.target.value);
              setResults([]);
              setChosen(null);
            }}
          />
        </label>
        <button
          disabled={query.trim().length < 2}
          onClick={() => {
            setResults([]);
            setChosen(null);
            void run('/geography/search', { provider, text: query }).then(
              (value) => {
                if (value) {
                  try {
                    setResults(geocodeResponseSchema.parse(value).results);
                  } catch {
                    setError('Invalid search response; project unchanged');
                  }
                }
              },
            );
          }}
        >
          Search places
        </button>
        <div className="geography-results">
          {results.map((place) => (
            <button
              key={place.id}
              aria-pressed={chosen?.id === place.id}
              onClick={() => setChosen(place)}
            >
              {place.label}
            </button>
          ))}
        </div>
        {chosen && (
          <div className="source-review">
            <p>
              {chosen.label} · WGS84 {chosen.coordinates.join(', ')}
            </p>
            <p>
              {chosen.source.credit} · {chosen.source.license} ·{' '}
              {chosen.source.sourceId}
            </p>
            <button onClick={() => apply('place', chosen)}>
              Add reviewed marker
            </button>
            <button
              disabled={points.length >= 10}
              onClick={() => {
                setPoints((p) => [...p, chosen]);
                setRoute(null);
              }}
            >
              Use as route waypoint
            </button>
          </div>
        )}
      </fieldset>
      <fieldset disabled={busy}>
        <legend>Calculate a road route</legend>
        <p>
          Road geometry comes from Openrouteservice. Confirm account terms and
          quotas below. Routing sends only reviewed waypoints to the fixed
          official HTTPS service.
        </p>
        <label>
          Road profile
          <select
            aria-label="Road profile"
            value={profile}
            onChange={(e) => {
              setProfile(e.target.value as typeof profile);
              setRoute(null);
            }}
          >
            <option value="driving-car">Driving</option>
            <option value="cycling-regular">Cycling</option>
            <option value="foot-walking">Walking</option>
          </select>
        </label>
        <ol>
          {points.map((point, i) => (
            <li key={`${point.id}-${i}`}>
              {point.label}
              <button
                aria-label={`Remove waypoint ${i + 1}`}
                onClick={() => {
                  setPoints((p) => p.filter((_, index) => i !== index));
                  setRoute(null);
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ol>
        <button
          disabled={points.length < 2}
          onClick={() => {
            setRoute(null);
            const request = directionsRequestSchema.parse({
              coordinates: points.map((p) => p.coordinates),
              profile,
            });
            void run('/geography/route', request).then((value) => {
              if (value) {
                try {
                  setRoute(roadRouteResultSchema.parse(value));
                } catch {
                  setError('Invalid route response; project unchanged');
                }
              }
            });
          }}
        >
          Calculate road route
        </button>
        <button
          onClick={() => {
            setPoints([]);
            setRoute(null);
          }}
        >
          Clear waypoints
        </button>
        {route && (
          <div className="source-review">
            <p>
              {(route.source.distanceMeters! / 1000).toFixed(2)} km ·{' '}
              {route.coordinates.length} source points · {route.source.profile}
            </p>
            <p>
              {route.source.credit} · {route.source.license} · Graph:{' '}
              {route.source.datasetVersion}
            </p>
            <p>
              Imported source geometry may be edited afterward. This animation
              editor does not provide navigation or live traffic.
            </p>
            <button onClick={() => apply('road-route', route)}>
              Add reviewed road route
            </button>
          </div>
        )}
      </fieldset>
      <details>
        <summary>
          Provider configuration ·{' '}
          {status?.configured ? 'configured' : 'required for roads/addresses'}
        </summary>
        <p>
          The key stays in API process memory, is lost on restart and never
          enters project JSON. No public demo routing service is used.
        </p>
        <p>
          <a
            href="https://account.heigit.org/info/tos"
            target="_blank"
            rel="noreferrer"
          >
            Account terms
          </a>{' '}
          ·{' '}
          <a
            href="https://openrouteservice.org/restrictions/"
            target="_blank"
            rel="noreferrer"
          >
            Service restrictions
          </a>
        </p>
        <fieldset disabled={busy}>
          <label>
            Account API key
            <input
              aria-label="Routing API key"
              type="password"
              autoComplete="off"
              value={key}
              maxLength={300}
              onChange={(e) => setKey(e.target.value)}
            />
          </label>
          <label>
            Requests per minute
            <input
              aria-label="Provider requests per minute"
              type="number"
              min={1}
              max={20}
              value={minute}
              onChange={(e) => setMinute(Number(e.target.value))}
            />
          </label>
          <label>
            Requests per day
            <input
              aria-label="Provider requests per day"
              type="number"
              min={1}
              max={500}
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
            />
          </label>
          <label>
            <input
              aria-label="Confirm provider terms"
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
            />
            I checked my account quota and terms for storing and exporting these
            results.
          </label>
          <button
            disabled={!terms || key.trim().length < 10}
            onClick={() => {
              void run('/geography/configure', {
                apiKey: key,
                termsAccepted: terms,
                perMinute: minute,
                perDay: day,
              }).then((value) => {
                if (value) {
                  setKey('');
                  setTerms(false);
                }
              });
            }}
          >
            Configure provider
          </button>
          <button
            onClick={() => {
              void run('/geography/configure', undefined, 'DELETE').then(() => {
                setKey('');
                setRoute(null);
              });
            }}
          >
            Forget provider key
          </button>
        </fieldset>
        {status && (
          <p>
            Local quota: {status.quota.usedMinute}/{status.quota.perMinute} this
            minute; {status.quota.usedDay}/{status.quota.perDay} over 24 hours.
            Account limits may be lower. Cooldown: {status.retryAfterSeconds}s.
          </p>
        )}
      </details>
      {busy && (
        <p role="status">
          Waiting for geography service…{' '}
          <button onClick={cancel}>Cancel request</button>
        </p>
      )}
      {(error || editor.error) && <p role="alert">{error || editor.error}</p>}
    </dialog>
  );
}
