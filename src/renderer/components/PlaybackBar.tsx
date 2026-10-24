import { FolderOpen, Pause, Play, Volume2 } from 'lucide-react';
import type { useAudioLibrary } from '../audio/useAudioLibrary';
import { useLocalPlayer } from '../audio/useLocalPlayer';
import { RecordArtwork } from './RecordArtwork';

function timecode(value: number) {
  const seconds = Math.max(0, Math.floor(value));
  return `${Math.floor(seconds / 60).toString()}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export function PlaybackBar({ audio }: { audio: ReturnType<typeof useAudioLibrary> }) {
  const { track, request } = audio.playback;
  const player = useLocalPlayer(track, request);
  return (
    <footer className="playback-bar" aria-label="Playback">
      <div className="now-playing">
        <RecordArtwork
          url={track?.artworkUrl ?? null}
          title={track?.album ?? ''}
          decorative
          className="mini-sleeve"
        />
        <div className="playing-info">
          <strong>{track?.title ?? 'Nothing on the deck'}</strong>
          <span>
            {track ? `${track.artist} · ${track.album}` : 'Download a source to listen here.'}
          </span>
        </div>
      </div>
      <button
        type="button"
        className="play-button"
        aria-label={player.playing ? 'Pause' : 'Play'}
        disabled={!track}
        onClick={() => {
          player.toggle().catch(() => undefined);
        }}
      >
        {player.playing ? (
          <Pause size={16} fill="currentColor" aria-hidden="true" />
        ) : (
          <Play size={16} fill="currentColor" aria-hidden="true" />
        )}
      </button>
      <div className="timeline">
        <span>{timecode(player.position)}</span>
        <input
          type="range"
          aria-label="Track position"
          min={0}
          max={player.duration || 0}
          step={0.1}
          value={player.position}
          disabled={!track || player.duration === 0}
          onChange={(event) => {
            player.seek(Number(event.target.value));
          }}
        />
        <span>{timecode(player.duration)}</span>
      </div>
      <div className="player-volume">
        <Volume2 size={14} aria-hidden="true" />
        <input
          type="range"
          aria-label="Volume"
          min={0}
          max={1}
          step={0.01}
          value={player.volume}
          onChange={(event) => {
            player.setVolume(Number(event.target.value));
          }}
        />
      </div>
      <div className="player-library">
        <select
          aria-label="Downloaded track"
          value={track?.id ?? ''}
          disabled={audio.tracks.length === 0}
          onChange={(event) => {
            const selected = audio.tracks.find((item) => item.id === event.target.value);
            if (selected) audio.play(selected);
          }}
        >
          <option value="" disabled>
            Downloads
          </option>
          {audio.tracks.map((item) => (
            <option key={item.id} value={item.id}>
              {item.artist} · {item.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="icon-button"
          aria-label={track ? 'Show track in folder' : 'Open downloads folder'}
          title="Music / Auto Digger"
          disabled={!audio.available}
          onClick={() => {
            audio.reveal(track?.id).catch(() => undefined);
          }}
        >
          <FolderOpen size={17} aria-hidden="true" />
        </button>
      </div>
      {(player.error || audio.error) && (
        <p role="alert" className="playback-notice">
          {player.error || audio.error}
        </p>
      )}
    </footer>
  );
}
