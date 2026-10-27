import { useId, useState } from 'react';
import { FolderOpen, Play } from 'lucide-react';
import type { AudioResult, AudioSource, LocalTrack } from '../../shared/audio';
import type { DiscogsRelease } from '../../shared/discogs';
import { sourceAssignment } from './source-assignment';
import { SourceDownloadButton } from './SourceDownloadButton';
import { SourcePreviewButton } from './SourcePreviewButton';
import type { useAudioLibrary } from './use-audio-library';

export function SourceRow({
  release,
  index,
  audio,
  saved,
  checked,
  retry,
  manual,
  onAssign,
}: {
  manual: number | null | undefined;
  onAssign: (trackIndex: number | null) => void;
  release: DiscogsRelease;
  index: number;
  audio: ReturnType<typeof useAudioLibrary>;
  saved: LocalTrack | undefined;
  checked: AudioResult<AudioSource> | null | undefined;
  retry: () => Promise<void>;
}) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const video = release.videos[index];
  if (!video) return null;
  const { sourceTitle, selected } = sourceAssignment(release, index, checked, saved, manual);
  const available = saved && !saved.missing;
  const changed = saved && selected !== saved.trackIndex;
  const job = audio.queue.jobs
    .filter((item) => item.releaseId === release.id && item.videoIndex === index)
    .at(-1);
  const failure = error ?? (job?.stage === 'failed' ? job.error?.message : null);
  let matchLabel = saved?.missing ? 'File missing' : 'Suggested match';
  if (selected === null) matchLabel = 'Unassigned';
  else if (available && !changed) matchLabel = 'Saved';
  else if (manual !== undefined) matchLabel = 'Your choice';
  async function download() {
    setPending(true);
    setError(null);
    const result = await audio.download({ release, videoIndex: index, trackIndex: selected });
    if (!result.ok) setError(result.error.message);
    setPending(false);
  }
  return (
    <li className="audio-source">
      <label className="source-assignment" htmlFor={id}>
        <span>Discogs track</span>
        <select
          id={id}
          value={selected === null ? '' : selected.toString()}
          disabled={audio.busy}
          onChange={(event) => {
            onAssign(event.target.value === '' ? null : Number(event.target.value));
          }}
        >
          <option value="">Unassigned · keep video title</option>
          {release.tracks.map((track, trackIndex) => (
            <option key={`${track.position}-${track.title}`} value={trackIndex}>
              {track.position} · {track.title}
            </option>
          ))}
        </select>
      </label>
      <div className="source-upload">
        <span>YouTube video</span>
        <p title={sourceTitle}>{sourceTitle || 'Untitled upload'}</p>
      </div>
      <div className="source-state">
        <span className={selected === null ? 'source-unassigned' : 'source-matched'}>
          {matchLabel}
        </span>
      </div>
      <div className="source-actions">
        {!available && (
          <SourcePreviewButton
            input={{ release, videoIndex: index, trackIndex: selected }}
            audio={audio}
            disabled={audio.busy || !checked?.ok}
            onError={setError}
            onPendingChange={setPreviewing}
          />
        )}
        {available && (
          <button
            type="button"
            className="secondary-button"
            aria-label="Play track"
            title="Play track"
            onClick={() => {
              audio.play(saved);
            }}
          >
            <Play size={12} aria-hidden="true" />
          </button>
        )}
        {(!available || changed) && (
          <SourceDownloadButton
            job={job}
            pending={pending}
            tagging={Boolean(available)}
            disabled={audio.busy || previewing || (!available && !checked?.ok)}
            onDownload={() => {
              download().catch(() => {
                setPending(false);
                setError('This download could not finish. Please retry.');
              });
            }}
            onCancel={(jobId) => {
              audio.queue.cancel(jobId).catch(() => undefined);
            }}
          />
        )}
        {available && (
          <button
            type="button"
            className="source-folder source-reveal"
            aria-label="Show track in folder"
            title="Show track in folder"
            onClick={() => {
              audio.reveal(saved.id).catch(() => undefined);
            }}
          >
            <FolderOpen size={13} aria-hidden="true" />
          </button>
        )}
        {!available && !checked && audio.available && <span role="status">Checking…</span>}
        {!audio.available && <span>Open the desktop app to download audio.</span>}
        {!available && checked && !checked.ok && (
          <button
            type="button"
            className="source-folder"
            onClick={() => {
              retry().catch(() => undefined);
            }}
          >
            Check again
          </button>
        )}
      </div>
      {!available && checked && !checked.ok && (
        <p role="alert" className="source-notice">
          {checked.error.message}
        </p>
      )}
      {failure && (
        <p role="alert" className="source-notice">
          {failure}
        </p>
      )}
      {saved?.warning && (
        <details className="source-tagging-note">
          <summary>Tagging note</summary>
          <p className="source-notice">{saved.warning}</p>
        </details>
      )}
    </li>
  );
}
