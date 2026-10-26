import { FolderOpen, Play, RotateCcw, X } from 'lucide-react';
import type { useAudioLibrary } from '../audio/use-audio-library';
import { RecordArtwork } from '../components/RecordArtwork';
import type { LibraryRow } from './rows';
import { pendingDownload } from './rows';
import { TrackNotice } from './TrackNotice';
import { DownloadState } from './DownloadState';

export function TrackRow({
  row,
  audio,
}: {
  row: LibraryRow;
  audio: ReturnType<typeof useAudioLibrary>;
}) {
  const { track, job } = row;
  const title = track?.title ?? job?.title ?? 'Untitled track';
  const artist = track?.artist ?? job?.artist ?? 'Artist not listed';
  const album = track?.album ?? job?.album ?? 'Release not listed';
  const artwork = track?.artworkUrl ?? job?.artworkUrl ?? null;
  const note = (job?.stage === 'failed' ? job.error?.message : null) ?? track?.warning;
  const current = track && audio.playback.track?.id === track.id;
  return (
    <tr className="library-row" aria-current={current ? 'true' : undefined}>
      <td>
        <div className="library-track">
          <RecordArtwork url={artwork} title={album} decorative />
          <div className="library-track-copy">
            <strong title={title}>{title}</strong>
            {job ? <DownloadState job={job} /> : null}
            {track?.missing && <span className="library-missing">File missing or unavailable</span>}
            {note && <TrackNotice text={note} title={title} />}
          </div>
        </div>
      </td>
      <td className="library-artist" title={artist}>
        {artist}
      </td>
      <td className="library-album" title={album}>
        {album}
      </td>
      <td>
        <div className="library-actions">
          {track && (
            <button
              type="button"
              className="icon-button"
              aria-label={`Play ${title}`}
              title="Play"
              disabled={track.missing === true}
              onClick={() => {
                audio.play(track);
              }}
            >
              <Play size={15} aria-hidden="true" />
            </button>
          )}
          {job && pendingDownload(job) && (
            <button
              type="button"
              className="icon-button"
              aria-label={`Cancel download ${job.title}`}
              title="Cancel download"
              disabled={job.stage === 'cancelling'}
              onClick={() => {
                audio.queue.cancel(job.id).catch(() => undefined);
              }}
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
          {job && ['failed', 'cancelled'].includes(job.stage) && (
            <button
              type="button"
              className="icon-button"
              aria-label={`Retry download ${job.title}`}
              title="Retry download"
              onClick={() => {
                audio.queue.retry(job.id).catch(() => undefined);
              }}
            >
              <RotateCcw size={15} aria-hidden="true" />
            </button>
          )}
          {track && (
            <button
              type="button"
              className="icon-button"
              aria-label={`Show ${title} in folder`}
              title="Show in folder"
              onClick={() => {
                audio.reveal(track.id).catch(() => undefined);
              }}
            >
              <FolderOpen size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
