import { Download } from 'lucide-react';
import { ReleaseDetails } from '../../discogs/ReleaseDetails';
import { demoTracks } from './demoData';
import { demoRelease } from './demoRelease';
import { SoulseekMatches } from './SoulseekMatches';
import { useDeskSoulseek } from './useDeskSoulseek';
import './deskPrototype.css';

export function DiggingDeskPrototype() {
  const state = useDeskSoulseek();
  return (
    <section className="release-workspace desk-audio-prototype" aria-label="Digging desk prototype">
      <p className="desk-prototype-note">
        Soulseek sketch · Demo results only. No audio files are downloaded.
      </p>
      <ReleaseDetails
        release={demoRelease}
        renderTrackActions={(index) => {
          const track = demoTracks[index];
          if (!track) return null;
          const saved = state.saved[track.id];
          const pending = state.pending?.trackId === track.id;
          return (
            <>
              <span className="desk-audio-actions">
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Download audio for ${track.title}`}
                  title="Download audio from YouTube"
                  disabled={Boolean(saved) || state.pending !== null}
                  onClick={() => {
                    state.youtube(index);
                  }}
                >
                  <Download size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="desk-use-soulseek"
                  aria-label={`Use Soulseek for ${track.title}`}
                  aria-expanded={state.track?.id === track.id}
                  onClick={() => {
                    state.open(index);
                  }}
                >
                  Use Soulseek
                </button>
              </span>
              {(pending || saved) && (
                <span className="desk-track-status" role="status">
                  {pending ? 'Queued in this demo' : `Saved from ${saved?.provider ?? ''}`}
                </span>
              )}
              {state.track?.id === track.id && <SoulseekMatches state={state} />}
            </>
          );
        }}
      />
    </section>
  );
}
