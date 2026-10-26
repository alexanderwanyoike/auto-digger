import { demoTracks } from './demoData';
import { OrganisationPreview } from './OrganisationPreview';
import { TrackInspector } from './TrackInspector';
import type { useAudioPrototype } from './useAudioPrototype';

export function ReleaseShelves({ state }: { state: ReturnType<typeof useAudioPrototype> }) {
  const releases = [...new Set(demoTracks.map((track) => track.releaseId))];
  return (
    <div className="prototype-shelves">
      <div className="prototype-release-index">
        {releases.map((id) => {
          const tracks = demoTracks.filter((track) => track.releaseId === id);
          const first = tracks[0];
          if (!first) return null;
          return (
            <section className="prototype-release" key={id} aria-label={first.release}>
              <div className={`prototype-sleeve sleeve-${id.toString()}`} aria-hidden="true">
                <span>{first.release}</span>
              </div>
              <div>
                <span className="eyebrow">
                  {first.artist} · DISCOGS r{id}
                </span>
                <h3>{first.release}</h3>
                {tracks.map((track) => (
                  <button
                    type="button"
                    key={track.id}
                    aria-pressed={state.track.id === track.id}
                    onClick={() => {
                      state.selectTrack(track);
                    }}
                  >
                    <span>{track.position}</span>
                    <strong>{track.title}</strong>
                    <small>
                      {state.library.copies.some((copy) => copy.candidate.trackId === track.id)
                        ? 'Saved'
                        : 'Find audio'}
                    </small>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <div className="prototype-shelf-detail">
        <OrganisationPreview state={state} />
        <TrackInspector state={state} />
      </div>
    </div>
  );
}
