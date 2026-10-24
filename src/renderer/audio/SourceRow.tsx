import { useId, useState } from 'react';
import { Download, FolderOpen, Play } from 'lucide-react';
import type { AudioResult, AudioSource, LocalTrack } from '../../shared/audio';
import type { DiscogsRelease } from '../../shared/discogs';
import { matchTrack } from '../../shared/matchTrack';
import type { useAudioLibrary } from './useAudioLibrary';

export function SourceRow({
  release,
  index,
  audio,
  saved,
  checked,
  retry,
}: {
  release: DiscogsRelease;
  index: number;
  audio: ReturnType<typeof useAudioLibrary>;
  saved: LocalTrack | undefined;
  checked: AudioResult<AudioSource> | null | undefined;
  retry: () => Promise<void>;
}) {
  const id = useId();
  const [manual, setManual] = useState<number | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const video = release.videos[index];
  if (!video) return null;
  const sourceTitle = saved?.sourceTitle ?? (checked?.ok ? checked.value.title : video.title);
  const suggestion = saved ? saved.trackIndex : matchTrack(release, sourceTitle);
  const selected = manual === undefined ? suggestion : manual;
  const changed = saved && selected !== saved.trackIndex;
  let actionLabel = saved ? 'Update tags' : 'Download audio';
  if (pending) actionLabel = 'Saving…';
  let matchLabel = 'Suggested match';
  if (selected === null) matchLabel = 'Unassigned';
  else if (saved && !changed) matchLabel = 'Saved';
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
            setManual(event.target.value === '' ? null : Number(event.target.value));
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
        {saved && (
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              audio.play(saved);
            }}
          >
            <Play size={12} aria-hidden="true" />
            Play track
          </button>
        )}
        {(!saved || changed) && (
          <button
            type="button"
            className="secondary-button source-download"
            disabled={audio.busy || (!saved && !checked?.ok)}
            onClick={() => {
              download().catch(() => {
                setPending(false);
                setError('This download could not finish. Please retry.');
              });
            }}
          >
            <Download size={12} aria-hidden="true" />
            {actionLabel}
          </button>
        )}
        {saved && (
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
        {!saved && !checked && audio.available && <span role="status">Checking…</span>}
        {!audio.available && <span>Open the desktop app to download audio.</span>}
        {!saved && checked && !checked.ok && (
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
      {!saved && checked && !checked.ok && (
        <p role="alert" className="source-notice">
          {checked.error.message}
        </p>
      )}
      {error && (
        <p role="alert" className="source-notice">
          {error}
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
