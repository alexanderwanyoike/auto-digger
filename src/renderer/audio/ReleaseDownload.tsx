import { useState } from 'react';
import type { DiscogsRelease } from '../../shared/discogs';
import { releaseDownloadPlan } from '../../shared/releaseDownloadPlan';
import type { useAudioLibrary } from './useAudioLibrary';

export function ReleaseDownload({
  release,
  assignments,
  checking,
  audio,
}: {
  release: DiscogsRelease;
  assignments: (number | null)[];
  checking: boolean;
  audio: ReturnType<typeof useAudioLibrary>;
}) {
  const [choices, setChoices] = useState<Record<number, number | null>>({});
  const [error, setError] = useState<string | null>(null);
  const plan = releaseDownloadPlan(release, assignments, choices);
  const ready = plan.filter((track) => track.state === 'ready');
  return (
    <div className="release-download">
      <div className="batch-heading">
        <h4>Download release</h4>
        <span>
          {ready.length} of {release.tracks.length} tracks ready
        </span>
      </div>
      <details>
        <summary>Review track coverage</summary>
        <ul>
          {plan.map((track) => (
            <li key={track.trackIndex}>
              <span>
                {track.position} · {track.title}
              </span>
              {track.state === 'missing' ? (
                <small>No source available</small>
              ) : (
                <label
                  className="sr-only-label"
                  htmlFor={`batch-source-${track.trackIndex.toString()}`}
                >
                  <span className="sr-only">
                    Source for {track.position} {track.title}
                  </span>
                  <select
                    id={`batch-source-${track.trackIndex.toString()}`}
                    aria-label={`Source for ${track.position} ${track.title}`}
                    value={
                      track.state === 'skipped' ? 'skip' : (track.videoIndex?.toString() ?? '')
                    }
                    disabled={audio.busy}
                    onChange={(event) => {
                      const { value } = event.target;
                      setChoices((previous) => ({
                        ...previous,
                        [track.trackIndex]: value === 'skip' ? null : Number(value),
                      }));
                    }}
                  >
                    <option value="" disabled>
                      Choose one source
                    </option>
                    <option value="skip">Skip this track</option>
                    {track.videoIndexes.map((index) => (
                      <option key={index} value={index}>
                        {release.videos[index]?.title ?? `Source ${(index + 1).toString()}`}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </li>
          ))}
        </ul>
      </details>
      <p>
        Review missing tracks and choose between alternative uploads. Only selected sources will be
        saved.
      </p>
      <button
        type="button"
        className="secondary-button"
        disabled={!ready.length || checking || audio.busy || !audio.queue.available}
        onClick={() => {
          setError(null);
          audio
            .downloadBatch(
              ready.flatMap((track) =>
                track.videoIndex === null
                  ? []
                  : [{ release, videoIndex: track.videoIndex, trackIndex: track.trackIndex }],
              ),
            )
            .then((result) => {
              if (!result.ok) setError(result.error.message);
            })
            .catch(() => {
              setError('This release could not be queued. Please retry.');
            });
        }}
      >
        Download {ready.length} available {ready.length === 1 ? 'track' : 'tracks'}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
