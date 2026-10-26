import { demoTracks } from './demoData';
import { OrganisationPreview } from './OrganisationPreview';
import { TrackInspector } from './TrackInspector';
import type { useAudioPrototype } from './useAudioPrototype';

export function SourceInspector({ state }: { state: ReturnType<typeof useAudioPrototype> }) {
  return (
    <div className="prototype-split">
      <aside className="prototype-tracklist" aria-label="Choose a release track">
        <span className="eyebrow">YOUR RECORDS</span>
        {demoTracks.map((track) => (
          <button
            type="button"
            key={track.id}
            aria-pressed={state.track.id === track.id}
            onClick={() => {
              state.selectTrack(track);
            }}
          >
            <span
              className={`prototype-sleeve sleeve-${track.releaseId.toString()}`}
              aria-hidden="true"
            />
            <strong>{track.title}</strong>
            <span>
              {track.artist} · {track.position}
            </span>
            <small>
              {state.library.copies
                .filter((copy) => copy.candidate.trackId === track.id)
                .length.toString()}{' '}
              saved copies
            </small>
          </button>
        ))}
        <OrganisationPreview state={state} />
      </aside>
      <TrackInspector state={state} />
    </div>
  );
}
