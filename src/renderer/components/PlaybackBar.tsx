import { Disc3, Play, SkipForward, Volume2 } from 'lucide-react';

export function PlaybackBar() {
  return (
    <footer className="playback-bar" aria-label="Playback">
      <div className="now-playing">
        <div className="mini-sleeve">
          <Disc3 size={21} strokeWidth={1.3} aria-hidden="true" />
        </div>
        <div>
          <strong>Nothing on the deck</strong>
          <span>YouTube playback comes in Phase 5.</span>
        </div>
      </div>
      <div className="transport">
        <button type="button" className="play-button" aria-label="Play" disabled>
          <Play size={17} fill="currentColor" />
        </button>
        <button className="icon-button" type="button" aria-label="Next track" disabled>
          <SkipForward size={17} />
        </button>
      </div>
      <div className="timeline" aria-hidden="true">
        <span>0:00</span>
        <div />
        <span>0:00</span>
      </div>
      <Volume2 className="volume-icon" size={17} aria-hidden="true" />
      <span className="playback-source">YouTube</span>
    </footer>
  );
}
