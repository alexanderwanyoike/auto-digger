import { useState } from 'react';
import { Search, X, LockKeyhole } from 'lucide-react';
import type { DiscogsRelease } from '../../shared/discogs';
import type { SoulseekMatch } from '../../shared/soulseek';
import type { useAudioLibrary } from './useAudioLibrary';
import { useSoulseekSearch } from './use-soulseek-search';
import { SoulseekTable } from './SoulseekTable';
import '../styles/soulseek.css';

export function SoulseekPanel({
  release,
  trackIndex,
  audio,
  close,
}: {
  release: DiscogsRelease;
  trackIndex: number;
  audio: ReturnType<typeof useAudioLibrary>;
  close: () => void;
}) {
  const state = useSoulseekSearch(
    window.soulseek,
    `${release.artists.join(' ')} ${release.tracks[trackIndex]?.title ?? ''}`,
  );
  const [limit, setLimit] = useState(40);
  const [error, setError] = useState<string | null>(null);
  const available = state.results?.matches.filter((match) => match.access === 'public') ?? [];
  const saved = audio.tracks.some(
    (track) =>
      track.releaseId === release.id &&
      track.trackIndex === trackIndex &&
      track.provider === 'soulseek' &&
      !track.missing,
  );
  async function download(match: SoulseekMatch) {
    setError(null);
    const result = await audio.download({
      provider: 'soulseek',
      release,
      trackIndex,
      candidateId: match.id,
    });
    if (result.ok) close();
    else setError(result.error.message);
  }
  return (
    <section className="soulseek-matches" aria-label="Soulseek matches">
      <header>
        <strong>Soulseek matches</strong>
        <button
          type="button"
          className="icon-button"
          aria-label="Close Soulseek matches"
          onClick={close}
        >
          <X size={13} aria-hidden="true" />
        </button>
      </header>
      <form
        className="soulseek-refine"
        onSubmit={(event) => {
          event.preventDefault();
          setLimit(40);
          state.search(state.query).catch(() => undefined);
        }}
      >
        <label htmlFor="soulseek-query">
          Refine search
          <input
            id="soulseek-query"
            aria-label="Refine Soulseek search"
            value={state.query}
            onChange={(event) => {
              state.edit(event.target.value);
            }}
            maxLength={256}
          />
        </label>
        <button
          type="submit"
          className="secondary-button"
          aria-label="Search Soulseek"
          disabled={state.searching}
        >
          <Search size={12} aria-hidden="true" />
          Search
        </button>
      </form>
      {(state.error ?? error) && <p role="alert">{state.error ?? error}</p>}
      {audio.busy && (
        <p role="status">Downloading in Auto Digger. You can follow or cancel it in Downloads.</p>
      )}
      <div className="soulseek-count" role="status">
        <span>
          {available.length.toString()} matches{state.searching ? ' · Searching…' : ''}
        </span>
        {available.length > 6 && <span>Scroll for more</span>}
      </div>
      {available.length > 0 && (
        <SoulseekTable
          matches={available.slice(0, limit)}
          disabled={audio.busy || saved}
          onDownload={(match) => {
            download(match).catch(() => {
              setError('This download could not finish. Please retry.');
            });
          }}
        />
      )}
      {available.length > limit && (
        <button
          type="button"
          className="soulseek-more"
          onClick={() => {
            setLimit((previous) => previous + 40);
          }}
        >
          Show 40 more ({(available.length - limit).toString()} remaining)
        </button>
      )}
      {state.results?.complete && available.length === 0 && (
        <p>
          {state.results.privateCount
            ? 'Only private matches found. Try a broader search.'
            : 'No audio matches found. Try a broader search.'}
        </p>
      )}
      {Boolean(state.results?.privateCount) && (
        <details className="soulseek-private">
          <summary>
            <LockKeyhole size={11} aria-hidden="true" />
            {state.results?.privateCount.toString()} private matches
          </summary>
          <p>These files are private on the sharing peer and cannot be downloaded here.</p>
        </details>
      )}
      {saved && <p>Saved from Soulseek</p>}
    </section>
  );
}
