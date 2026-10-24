import { Disc3, Play } from 'lucide-react';
import type { DiscogsRelease } from '../../shared/discogs';

export function PlaybackBar({ release }: { release: DiscogsRelease | null }) {
  return (
    <footer className="playback-bar" aria-label="Playback">
      <div className="now-playing">
        <div className="mini-sleeve">
          <Disc3 size={21} strokeWidth={1.3} aria-hidden="true" />
        </div>
        <div>
          <strong>{release?.title ?? 'Nothing on the deck'}</strong>
          <span>
            {release
              ? 'Use the YouTube controls in the record view.'
              : 'Select a record to listen on YouTube.'}
          </span>
        </div>
      </div>
      <div className="transport">
        <button
          type="button"
          className="play-button"
          aria-label={release ? 'Show YouTube player' : 'Play'}
          disabled={!release}
          onClick={() => {
            document
              .querySelector('.youtube-player')
              ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
          }}
        >
          <Play size={17} fill="currentColor" aria-hidden="true" />
        </button>
      </div>
      <span className="playback-source">YouTube</span>
    </footer>
  );
}
