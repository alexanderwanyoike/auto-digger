import { useEffect, useState } from 'react';
import type {
  ApiProbeInput,
  ApiProbeReport,
  ApiPrototypeError,
  ApiPrototypeStatus,
  ApiProvider,
} from '../../shared/api-feasibility-prototype';
import { ApiProbeResults, cosineOperations } from './ApiProbeResults';
import '../styles/api-feasibility-prototype.css';

const defaultOperations: Record<ApiProvider, ApiProbeInput['operation']> = {
  cosine: 'lookup',
  beatport: 'search',
  bandcamp: 'account',
};

const services = {
  cosine: {
    name: 'Cosine Club',
    credential: 'Cosine Club API key',
    description:
      'Recommendations from a chosen track. URL lookup checks the existing catalogue; a missing URL is not automatically submitted for analysis.',
  },
  beatport: {
    name: 'Beatport',
    credential: 'Beatport access token',
    description:
      'Test release search with your own authorised access token. A shop account alone may not grant catalogue API access.',
  },
  bandcamp: {
    name: 'Bandcamp',
    credential: 'Bandcamp access token',
    description:
      'Test the documented managed-bands endpoint. Account access does not establish a catalogue search API for digging.',
  },
};

export function ApiFeasibilityPrototype() {
  const bridge = window.apiFeasibility;
  const [provider, setProvider] = useState<ApiProvider>('cosine');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<ApiPrototypeStatus>({
    cosine: false,
    beatport: false,
    bandcamp: false,
  });
  const [operation, setOperation] = useState<ApiProbeInput['operation']>('lookup');
  const [query, setQuery] = useState('https://www.youtube.com/watch?v=BnvG83gMLEk');
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<ApiProbeReport | null>(null);
  const [error, setError] = useState<ApiPrototypeError | null>(null);
  useEffect(() => {
    let active = true;
    bridge
      ?.status()
      .then((result) => {
        if (!active) return;
        if (result.ok) setStatus(result.value);
        else setError(result.error);
      })
      .catch(() => {
        if (active)
          setError({ code: 'unavailable', message: 'The prototype settings could not load.' });
      });
    return () => {
      active = false;
    };
  }, [bridge]);
  async function credential(forget = false) {
    if (!bridge) return;
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      const result = forget ? await bridge.forget() : await bridge.configure(provider, token);
      if (result.ok) {
        setStatus(result.value);
        setToken('');
      } else setError(result.error);
    } catch {
      setError({ code: 'unavailable', message: 'Session credentials could not be updated.' });
    } finally {
      setBusy(false);
    }
  }
  async function probe(chosenOperation = operation, chosenQuery = query) {
    if (!bridge) return;
    setBusy(true);
    setError(null);
    setReport(null);
    const input: ApiProbeInput = {
      provider,
      operation: chosenOperation,
      query: chosenQuery,
      ...(provider === 'cosine' && chosenOperation === 'similar' && startYear
        ? { startYear: Number(startYear) }
        : {}),
      ...(provider === 'cosine' && chosenOperation === 'similar' && endYear
        ? { endYear: Number(endYear) }
        : {}),
    };
    try {
      const result = await bridge.probe(input);
      if (result.ok) setReport(result.value);
      else setError(result.error);
    } catch {
      setError({ code: 'unavailable', message: 'The live check failed. Please retry.' });
    } finally {
      setBusy(false);
    }
  }
  const service = services[provider];
  return (
    <section
      className="settings-card api-feasibility-prototype"
      aria-label="API feasibility prototype"
    >
      <div>
        <span className="eyebrow">Prototype · do not merge</span>
        <h2>API feasibility</h2>
      </div>
      <p>
        Read-only checks for digging sources and recommendations. This experiment does not save
        picks or download audio. Credentials stay in memory until you quit this prototype.
      </p>
      <div className="api-probe-controls">
        <label htmlFor="api-probe-service">
          Service
          <select
            id="api-probe-service"
            aria-label="Service"
            value={provider}
            disabled={busy}
            onChange={(event) => {
              const next = event.target.value;
              if (next !== 'cosine' && next !== 'beatport' && next !== 'bandcamp') return;
              setProvider(next);
              setToken('');
              setReport(null);
              setError(null);
              setOperation(defaultOperations[next]);
              setQuery(
                next === 'cosine' ? 'https://www.youtube.com/watch?v=BnvG83gMLEk' : 'Hipp-E',
              );
            }}
          >
            <option value="cosine">Cosine Club</option>
            <option value="beatport">Beatport</option>
            <option value="bandcamp">Bandcamp</option>
          </select>
        </label>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            credential().catch(() => undefined);
          }}
        >
          <label htmlFor="api-probe-key">
            {service.credential}
            <input
              id="api-probe-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              required
              value={token}
              disabled={busy}
              onChange={(event) => {
                setToken(event.target.value);
              }}
            />
          </label>
          <button type="submit" className="secondary-button" disabled={busy}>
            Use for this session
          </button>
        </form>
      </div>
      <p>{service.description}</p>
      <p role="status">
        {status[provider]
          ? `${service.name} credential set for this session.`
          : 'No credential set. A live check will test anonymous access.'}
      </p>
      <form
        className="api-probe-form"
        onSubmit={(event) => {
          event.preventDefault();
          probe().catch(() => undefined);
        }}
      >
        {provider === 'cosine' && (
          <label htmlFor="api-probe-operation">
            Operation
            <select
              id="api-probe-operation"
              aria-label="Operation"
              value={operation}
              disabled={busy}
              onChange={(event) => {
                const next = cosineOperations.find((item) => item.value === event.target.value);
                if (next) {
                  setOperation(next.value);
                  setReport(null);
                  setError(null);
                }
              }}
            >
              {cosineOperations.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {provider !== 'bandcamp' && (
          <label htmlFor="api-probe-query">
            Track query or URL
            <input
              id="api-probe-query"
              value={query}
              required
              maxLength={2000}
              disabled={busy}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
            />
          </label>
        )}
        {provider === 'cosine' && (
          <div className="api-probe-years">
            <label htmlFor="api-probe-from">
              From year
              <input
                id="api-probe-from"
                type="number"
                min="1900"
                max="2030"
                value={startYear}
                disabled={busy}
                onChange={(event) => {
                  setStartYear(event.target.value);
                }}
              />
            </label>
            <label htmlFor="api-probe-to">
              To year
              <input
                id="api-probe-to"
                type="number"
                min="1900"
                max="2030"
                value={endYear}
                disabled={busy}
                onChange={(event) => {
                  setEndYear(event.target.value);
                }}
              />
            </label>
            <p>Year filters apply when requesting similar tracks.</p>
          </div>
        )}
        <div className="api-probe-actions">
          <button type="submit" className="secondary-button" disabled={busy}>
            {busy ? 'Checking…' : 'Run live check'}
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={busy}
            onClick={() => {
              credential(true).catch(() => undefined);
            }}
          >
            Forget session keys
          </button>
        </div>
      </form>
      <ApiProbeResults
        report={report}
        error={error}
        busy={busy}
        onSimilar={(id) => {
          setOperation('similar');
          setQuery(id);
          probe('similar', id).catch(() => undefined);
        }}
      />
    </section>
  );
}
