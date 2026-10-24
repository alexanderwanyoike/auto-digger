import { useId, useState } from 'react';
import { Download, Play } from 'lucide-react';
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
  const sourceTitle = checked?.ok ? checked.value.title : video.title;
  const suggestion = saved ? saved.trackIndex : matchTrack(release, sourceTitle);
  const selected = manual === undefined ? suggestion : manual;
  const changed = saved && selected !== saved.trackIndex;
  async function download() {
    setPending(true);
    setError(null);
    const result = await audio.download({ release, videoIndex: index, trackIndex: selected });
    if (!result.ok) setError(result.error.message);
    setPending(false);
  }
  return (
    <li className="audio-source">
      <div className="source-heading">
        <span className="source-number">{(index + 1).toString().padStart(2, '0')}</span>
        <strong>{video.title || 'Untitled YouTube source'}</strong>
        <span className="source-provider">YouTube</span>
      </div>
      <div className="source-assignment">
        <label htmlFor={id}>Discogs track</label>
        <select
          id={id}
          value={selected === null ? '' : selected.toString()}
          disabled={audio.busy}
          onChange={(event) => {
            setManual(event.target.value === '' ? null : Number(event.target.value));
          }}
        >
          <option value="">Keep video title</option>
          {release.tracks.map((track, trackIndex) => (
            <option key={`${track.position}-${track.title}`} value={trackIndex}>
              {track.position} · {track.title}
            </option>
          ))}
        </select>
      </div>
      <p className="source-match">
        {selected === null
          ? 'No confident match. Choose a track above, or keep the video title.'
          : 'Discogs tags will use this track. You can change the match.'}
      </p>
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
            {pending ? 'Saving audio…' : saved ? 'Update tags' : 'Download audio'}
          </button>
        )}
        {saved && (
          <button
            type="button"
            className="source-folder"
            onClick={() => {
              audio.reveal(saved.id).catch(() => undefined);
            }}
          >
            Show in folder
          </button>
        )}
        {!saved && !checked && audio.available && <span role="status">Checking availability…</span>}
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
      {saved?.warning && <p className="source-notice">{saved.warning}</p>}
    </li>
  );
}
