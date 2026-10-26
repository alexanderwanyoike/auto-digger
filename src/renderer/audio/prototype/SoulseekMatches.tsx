import { LockKeyhole, Search, X } from 'lucide-react';
import { demoSoulseekResults } from './demoData';
import { SoulseekResultsTable } from './SoulseekResultsTable';
import type { useDeskSoulseek } from './useDeskSoulseek';

export function SoulseekMatches({ state }: { state: ReturnType<typeof useDeskSoulseek> }) {
  const { track } = state;
  if (!track) return null;
  const result = demoSoulseekResults(track, state.scenario);
  const candidates = result.ok ? result.value : [];
  const available = candidates.filter((candidate) => candidate.access === 'public');
  const locked = candidates.filter((candidate) => candidate.access === 'private');
  const saved = Boolean(state.saved[track.id]);
  return (
    <section className="desk-soulseek-matches" aria-label="Soulseek matches">
      <header>
        <strong>Soulseek matches</strong>
        <button
          type="button"
          className="icon-button"
          aria-label="Close Soulseek matches"
          onClick={state.close}
        >
          <X size={13} aria-hidden="true" />
        </button>
      </header>
      <form
        className="desk-soulseek-refine"
        aria-label="Refine Soulseek search"
        onSubmit={(event) => {
          event.preventDefault();
          state.search();
        }}
      >
        <label htmlFor="desk-soulseek-query">
          Refine search
          <input
            id="desk-soulseek-query"
            aria-label="Soulseek search query"
            value={state.query}
            onChange={(event) => {
              state.edit(event.target.value);
            }}
          />
        </label>
        <button type="submit" className="secondary-button">
          <Search size={12} aria-hidden="true" />
          Search
        </button>
        <output className="sr-only" aria-label="Clean Soulseek query">
          {state.cleaned || '(empty)'}
        </output>
      </form>
      {state.error && <p role="alert">{state.error}</p>}
      {state.checked && !result.ok && (
        <p>Soulseek is not connected in this demo. You can still use YouTube.</p>
      )}
      {state.checked && result.ok && !available.length && (
        <p>
          {locked.length
            ? 'Only private matches found. Try a broader search.'
            : 'No matches found. Try a broader search.'}
        </p>
      )}
      {state.checked && available.length > 0 && (
        <SoulseekResultsTable
          candidates={available}
          saved={saved}
          busy={state.pending !== null}
          download={state.download}
        />
      )}
      {state.checked && locked.length > 0 && (
        <details className="desk-soulseek-private">
          <summary>
            <LockKeyhole size={11} aria-hidden="true" />
            {locked.length.toString()} private match
          </summary>
          {locked.map((candidate) => (
            <div className="desk-soulseek-result" key={candidate.id}>
              <div>
                <strong>{candidate.filename}</strong>
                <span>Private match from {candidate.owner}</span>
              </div>
              <button
                type="button"
                className="secondary-button"
                aria-label={`Download from ${candidate.owner}`}
                disabled
              >
                Private
              </button>
            </div>
          ))}
        </details>
      )}
    </section>
  );
}
