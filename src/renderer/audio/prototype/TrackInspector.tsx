import { Search, SlidersHorizontal } from 'lucide-react';
import { CandidateResults } from './CandidateResults';
import { SavedCopies } from './SavedCopies';
import type { useAudioPrototype } from './useAudioPrototype';

export function TrackInspector({ state }: { state: ReturnType<typeof useAudioPrototype> }) {
  const { track, library } = state;
  const stage = library.job?.stage;
  let progress = '';
  if (stage === 'queued')
    progress =
      library.job?.candidate.provider === 'Soulseek' ? 'Queued in slskd' : 'Queued for YouTube';
  if (stage === 'downloading') progress = 'Downloading demo audio';
  if (stage === 'importing') progress = 'Importing into your library';
  if (stage === 'complete') progress = 'Demo copy ready';
  return (
    <div className="prototype-inspector">
      <header className="prototype-track-heading">
        <span className="prototype-position">{track.position}</span>
        <div>
          <h3>{track.title}</h3>
          <p>
            {track.artist} · {track.release}
          </p>
        </div>
        <span className="prototype-match-note">Release track · r{track.releaseId}</span>
      </header>
      <form
        className="prototype-search"
        onSubmit={(event) => {
          event.preventDefault();
          state.check();
        }}
      >
        <label htmlFor="prototype-query">
          Soulseek search query
          <input
            id="prototype-query"
            value={state.query}
            onChange={(event) => {
              state.setQuery(event.target.value);
            }}
          />
        </label>
        <button type="submit" className="primary-button">
          <Search size={13} aria-hidden="true" />
          Check audio sources
        </button>
        <div className="prototype-clean-query">
          <span>Clean query</span>
          <output aria-label="Soulseek query sent">{state.cleaned || '(empty)'}</output>
          <small>Punctuation becomes spaces. Accented letters stay. Demo matches are fixed.</small>
        </div>
      </form>
      {state.error && (
        <p className="prototype-error" role="alert">
          {state.error}
        </p>
      )}
      <div className="prototype-source-options">
        <span>
          <SlidersHorizontal size={12} aria-hidden="true" />
          Possible matches. Check the mix.
        </span>
        <label htmlFor="prototype-private">
          <input
            id="prototype-private"
            type="checkbox"
            checked={state.showPrivate}
            onChange={(event) => {
              state.setShowPrivate(event.target.checked);
            }}
          />
          Show private results
        </label>
      </div>
      <CandidateResults
        track={track}
        checked={state.checked}
        scenario={state.scenario}
        showPrivate={state.showPrivate}
        onSave={state.save}
        unavailable={library.copies.map((copy) => copy.candidate.id)}
      />
      {state.confirmation && (
        <div className="prototype-confirmation" role="group" aria-label="Keep another audio copy">
          <div>
            <p>You already have audio for this track.</p>
            <small>Keep the new source as another copy. The preferred copy stays selected.</small>
          </div>
          <button type="button" className="secondary-button" onClick={state.confirm}>
            Keep another copy
          </button>
          <button type="button" className="secondary-button" onClick={state.cancelConfirmation}>
            Cancel
          </button>
        </div>
      )}
      {library.job && (
        <div className="prototype-transfer">
          <div>
            <p role="status">{progress}</p>
            <small>{library.job.candidate.filename}</small>
          </div>
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
    </div>
  );
}
