import { useState } from 'react';
import { CandidateResults } from './CandidateResults';
import { DemoLibrary } from './DemoLibrary';
import { SavedCopies } from './SavedCopies';
import { useDemoCopies } from './useDemoCopies';
import type { DemoCandidate } from './demoData';
import { demoTracks } from './demoData';
import './prototype.css';

export function AudioSourcePrototype() {
  const library = useDemoCopies();
  const [confirmation, setConfirmation] = useState<DemoCandidate | null>(null);
  const [query, setQuery] = useState('Low Tide - Quiet Orbit (Original Mix)');
  const [scenario, setScenario] = useState('normal');
  const [checked, setChecked] = useState(false);
  const [showPrivate, setShowPrivate] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cleaned = query.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const track = demoTracks[0];
  if (!track) return null;
  function queue(candidate: DemoCandidate) {
    const result = library.queue(candidate);
    setError(result.ok ? null : result.error.message);
    setConfirmation(null);
  }
  function save(candidate: DemoCandidate) {
    if (library.copies.some((copy) => copy.candidate.trackId === candidate.trackId))
      setConfirmation(candidate);
    else queue(candidate);
  }
  return (
    <section className="section-page audio-prototype" aria-label="Audio sources prototype">
      <header className="prototype-heading">
        <div>
          <span className="eyebrow">AUDIO SOURCE STUDY · THROWAWAY</span>
          <h2>Audio sources prototype</h2>
          <p>Demo data. No searches, downloads or files leave this page.</p>
        </div>
        <label htmlFor="prototype-scenario">
          Search scenario
          <select
            id="prototype-scenario"
            value={scenario}
            onChange={(event) => {
              setScenario(event.target.value);
              setChecked(false);
            }}
          >
            <option value="normal">Public and private matches</option>
            <option value="private-only">Private matches only</option>
            <option value="offline">slskd disconnected</option>
            <option value="empty">No matches</option>
          </select>
        </label>
      </header>
      <div className="prototype-track-heading">
        <span className="prototype-position">{track.position}</span>
        <div>
          <h3>{track.title}</h3>
          <p>
            {track.artist} · {track.release}
          </p>
        </div>
      </div>
      <form
        className="prototype-search"
        onSubmit={(event) => {
          event.preventDefault();
          setError(cleaned ? null : 'Add letters or numbers before checking sources.');
          setChecked(Boolean(cleaned));
        }}
      >
        <label htmlFor="prototype-query">
          Soulseek search query
          <input
            id="prototype-query"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setChecked(false);
            }}
          />
        </label>
        <button type="submit" className="primary-button">
          Check audio sources
        </button>
        <div className="prototype-clean-query">
          <span>Clean query</span>
          <output aria-label="Soulseek query sent">{cleaned || '(empty)'}</output>
          <small>Punctuation becomes spaces. Accented letters stay. Demo matches are fixed.</small>
        </div>
      </form>
      {error && <p role="alert">{error}</p>}
      <div className="prototype-source-options">
        <span>Possible matches. Check the mix before choosing a copy.</span>
        <label htmlFor="prototype-private">
          <input
            id="prototype-private"
            type="checkbox"
            checked={showPrivate}
            onChange={(event) => setShowPrivate(event.target.checked)}
          />
          Show private results
        </label>
      </div>
      <CandidateResults
        track={track}
        checked={checked}
        scenario={scenario}
        showPrivate={showPrivate}
        onSave={save}
        unavailable={library.copies.map((copy) => copy.candidate.id)}
      />
      {confirmation && (
        <div className="prototype-confirmation" role="group" aria-label="Keep another audio copy">
          <p>You already have audio for this track.</p>
          <button type="button" className="secondary-button" onClick={() => queue(confirmation)}>
            Keep another copy
          </button>
          <button type="button" className="secondary-button" onClick={() => setConfirmation(null)}>
            Cancel
          </button>
        </div>
      )}
      {library.job && (
        <div className="prototype-transfer">
          <p role="status">
            {library.job.stage === 'queued'
              ? library.job.candidate.provider === 'Soulseek'
                ? 'Queued in slskd'
                : 'Queued for YouTube'
              : library.job.stage === 'complete'
                ? 'Demo copy ready'
                : library.job.stage === 'importing'
                  ? 'Importing into your library'
                  : 'Downloading demo audio'}
          </p>
          {library.active && (
            <>
              <button type="button" className="secondary-button" onClick={library.advance}>
                Advance demo transfer
              </button>
              <button type="button" className="secondary-button" onClick={library.cancel}>
                Cancel demo transfer
              </button>
            </>
          )}
        </div>
      )}
      <SavedCopies
        track={track}
        copies={library.copies}
        preferred={library.preferred[track.id]}
        onPrefer={library.prefer}
      />
      <DemoLibrary copies={library.copies} preferred={library.preferred} />
    </section>
  );
}
