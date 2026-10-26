import { useId, useState } from 'react';
import type { DiscogsRelease } from '../../shared/discogs';
import type { useAudioLibrary } from './use-audio-library';
import { SoulseekPanel } from './SoulseekPanel';

export function SoulseekSources({
  release,
  audio,
}: {
  release: DiscogsRelease;
  audio: ReturnType<typeof useAudioLibrary>;
}) {
  const id = useId();
  const [trackIndex, setTrackIndex] = useState(0);
  if (!release.tracks.length)
    return <p className="source-notice">No tracklist is available to search.</p>;
  return (
    <div className="soulseek-sources">
      <label className="source-assignment" htmlFor={id}>
        <span>Discogs track</span>
        <select
          id={id}
          aria-label="Soulseek track"
          value={trackIndex}
          onChange={(event) => {
            setTrackIndex(Number(event.target.value));
          }}
        >
          {release.tracks.map((track, index) => (
            <option key={`${track.position}-${track.title}`} value={index}>
              {track.position} · {track.title}
            </option>
          ))}
        </select>
      </label>
      <SoulseekPanel key={trackIndex} release={release} trackIndex={trackIndex} audio={audio} />
    </div>
  );
}
