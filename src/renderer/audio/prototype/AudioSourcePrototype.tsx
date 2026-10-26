import { useState } from 'react';
import { CandidateResults } from './CandidateResults';
import { demoTracks } from './demoData';
import './prototype.css';

export function AudioSourcePrototype() {
  const [query, setQuery] = useState('Low Tide - Quiet Orbit (Original Mix)');
  const [scenario, setScenario] = useState('normal');
  const [checked, setChecked] = useState(false);
  const [showPrivate, setShowPrivate] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cleaned = query.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const track = demoTracks[0];
  if (!track) return null;
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
      />
    </section>
  );
}
