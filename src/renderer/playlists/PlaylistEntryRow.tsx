import { Play, X } from 'lucide-react';
import type { DiscogsRelease } from '../../shared/discogs';
import type { Playlist } from '../../shared/playlists';
import type { useAudioLibrary } from '../audio/use-audio-library';
import { downloadLabels } from '../audio/download-labels';
import { RecordArtwork } from '../components/RecordArtwork';
import { localPlaylistTrack, playlistJob } from './playlist-audio';

export function PlaylistEntryRow({
  entry,
  playlist,
  audio,
  enabled,
  onOpen,
  onRemove,
}: {
  entry: Playlist['entries'][number];
  playlist: string;
  audio: ReturnType<typeof useAudioLibrary>;
  enabled: boolean;
  onOpen: (release: DiscogsRelease) => void;
  onRemove: (id: string) => void;
}) {
  const { track } = entry;
  const { release } = track;
  const title = release.tracks[track.trackIndex]?.title ?? release.title;
  const saved = localPlaylistTrack(track, audio.tracks);
  const job = playlistJob(track, audio.queue.jobs);
  const active = job && !['complete', 'failed', 'cancelled'].includes(job.stage);
  const retry = job && ['failed', 'cancelled'].includes(job.stage);
  return (
    <li className="playlist-entry">
      <RecordArtwork url={release.artworkUrl} title={release.title} decorative />
      <div className="playlist-entry-text">
        <strong>{title}</strong>
        <span>{[release.artists.join(', '), release.title].filter(Boolean).join(' · ')}</span>
      </div>
      <div className="playlist-entry-actions">
        {saved && (
          <button
            type="button"
            className="secondary-button"
            aria-label={`Play ${title}`}
            onClick={() => {
              audio.play(saved);
            }}
          >
            <Play size={13} aria-hidden="true" /> Play
          </button>
        )}
        {!saved && active && <span role="status">{downloadLabels[job.stage]}</span>}
        {!saved && retry && (
          <button
            type="button"
            className="secondary-button"
            aria-label={`Retry download ${title}`}
            onClick={() => {
              audio.queue.retry(job.id).catch(() => undefined);
            }}
          >
            Retry download
          </button>
        )}
        {!saved && !active && !retry && (
          <button
            type="button"
            className="secondary-button"
            aria-label={`Choose audio for ${title}`}
            onClick={() => {
              onOpen(release);
            }}
          >
            Choose audio
          </button>
        )}
        <button
          type="button"
          className="icon-button"
          aria-label={`Remove ${title} from ${playlist}`}
          title={`Remove from ${playlist}`}
          disabled={!enabled}
          onClick={() => {
            onRemove(entry.id);
          }}
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}
