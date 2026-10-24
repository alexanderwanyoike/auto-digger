import { FolderOpen, Pause, Play, Square, Volume2 } from 'lucide-react';
import type { useAudioLibrary } from '../audio/useAudioLibrary';
import { usePlayer } from '../audio/usePlayer';
import { RecordArtwork } from './RecordArtwork';

function timecode(value: number) {
  const seconds = Math.max(0, Math.floor(value));
  return `${Math.floor(seconds / 60).toString()}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export function PlaybackBar({ audio }: { audio: ReturnType<typeof useAudioLibrary> }) {
  const { track, request } = audio.playback;
  const player = usePlayer(track, request);
  let description = audio.previewing ? 'Preparing preview…' : 'Preview a source to listen here.';
  if (track)
    description = `${track.source === 'preview' ? 'Preview · ' : ''}${track.artist} · ${track.album}`;
  if (track?.source === 'preview' && player.buffering) description = 'Buffering preview…';
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
          <span>{description}</span>
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
        {(track?.source === 'preview' || audio.previewing) && (
          <button
            type="button"
            className="icon-button"
            aria-label="Stop preview"
            onClick={() => {
              audio.stopPreview().catch(() => undefined);
            }}
          >
            <Square size={13} aria-hidden="true" />
          </button>
        )}
        <select
          aria-label="Downloaded track"
          value={track?.id ?? ''}
          disabled={audio.tracks.length === 0}
          onChange={(event) => {
            const selected = audio.tracks.find((item) => item.id === event.target.value);
            if (selected) audio.play(selected);
          }}
        >
          {track?.source === 'preview' && <option value={track.id}>Preview · {track.title}</option>}
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
          aria-label={
            track?.source === 'download' ? 'Show track in folder' : 'Open downloads folder'
          }
          title="Music / Auto Digger"
          disabled={!audio.available}
          onClick={() => {
            audio
              .reveal(track?.source === 'download' ? track.id : undefined)
              .catch(() => undefined);
          }}
        >
          <FolderOpen size={17} aria-hidden="true" />
        </button>
      </div>
      {(player.error ?? audio.error) && (
        <p role="alert" className="playback-notice">
          {player.error ?? audio.error}
        </p>
      )}
    </footer>
  );
}
