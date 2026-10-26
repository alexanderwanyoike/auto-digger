import { useState } from 'react';
import { Disc3 } from 'lucide-react';
import type { useCrate } from '../crate/use-crate';
import { ReleaseAudioDetails } from '../audio/ReleaseAudioDetails';
import type { useAudioLibrary } from '../audio/use-audio-library';
import type { useDiscogs } from './use-discogs';
import { DigControls } from './DigControls';
import { SearchResults } from './SearchResults';

export function ReleaseWorkspace({
  session,
  crate,
  audio,
}: {
  session: ReturnType<typeof useDiscogs>;
  crate: ReturnType<typeof useCrate>;
  audio: ReturnType<typeof useAudioLibrary>;
}) {
  const [id, setId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  return (
    <section className="release-workspace" aria-label="Discogs releases">
      <form
        className="release-lookup"
        onSubmit={(event) => {
          event.preventDefault();
          setFormError(null);
          session.loadRelease(Number(id)).catch(() => {
            setFormError('Could not load this release. Please try again.');
          });
        }}
      >
        <label htmlFor="release-id">
          Discogs release ID
          <input
            id="release-id"
            inputMode="numeric"
            pattern="[0-9]+"
            placeholder="e.g. 1"
            required
            value={id}
            disabled={session.busy || !session.account}
            onChange={(event) => {
              setId(event.target.value);
            }}
          />
        </label>
        <button
          type="submit"
          className="secondary-button"
          disabled={session.busy || !session.account}
        >
          {session.busy ? 'Loading…' : 'Load release'}
        </button>
      </form>
      <DigControls session={session} />
      {formError && (
        <p role="alert" className="dialog-error">
          {formError}
        </p>
      )}
      {session.busy && (
        <div className="release-placeholder" role="status">
          <Disc3 size={32} aria-hidden="true" />
          <p>Loading release metadata…</p>
        </div>
      )}
      {!session.busy && !session.release && <SearchResults session={session} />}
      {session.release && session.matches && (
        <button
          type="button"
          className="secondary-button back-to-matches"
          disabled={session.busy || !session.account}
          onClick={session.closeRelease}
        >
          Back to matches
        </button>
      )}
      {!session.busy && session.release && (
        <ReleaseAudioDetails
          key={`${session.release.id.toString()}-${session.release.artworkUrl ?? ''}`}
          release={session.release}
          crate={crate}
          audio={audio}
        />
      )}
      {!session.busy && !session.release && !session.matches && (
        <div className="release-placeholder">
          <Disc3 size={40} strokeWidth={1} aria-hidden="true" />
          <h2>Follow a record.</h2>
          <p>Enter a Discogs release ID to take a closer look.</p>
          <span>Set filters to explore matching releases.</span>
        </div>
      )}
    </section>
  );
}
