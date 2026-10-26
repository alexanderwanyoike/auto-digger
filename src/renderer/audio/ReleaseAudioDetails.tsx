import { useState } from 'react';
import type { DiscogsRelease } from '../../shared/discogs';
import type { useAudioLibrary } from './useAudioLibrary';
import type { useCrate } from '../crate/useCrate';
import { SaveToCrate } from '../crate/SaveToCrate';
import { ReleaseDetails } from '../discogs/ReleaseDetails';
import { DownloadSources } from './DownloadSources';
import { SoulseekPanel } from './SoulseekPanel';

export function ReleaseAudioDetails({
  release,
  audio,
  crate,
}: {
  release: DiscogsRelease;
  audio: ReturnType<typeof useAudioLibrary>;
  crate: ReturnType<typeof useCrate>;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <ReleaseDetails
      release={release}
      renderTrackActions={(index) => (
        <>
          <button
            type="button"
            className="use-soulseek"
            aria-label={`Use Soulseek for ${release.tracks[index]?.title ?? 'track'}`}
            aria-expanded={selected === index}
            onClick={() => {
              setSelected(selected === index ? null : index);
            }}
          >
            Use Soulseek
          </button>
          {audio.tracks.some(
            (track) =>
              track.releaseId === release.id &&
              track.trackIndex === index &&
              track.provider === 'soulseek' &&
              !track.missing,
          ) && <span className="soulseek-saved">Saved from Soulseek</span>}
          {selected === index && (
            <SoulseekPanel
              key={index}
              release={release}
              trackIndex={index}
              audio={audio}
              close={() => {
                setSelected(null);
              }}
            />
          )}
        </>
      )}
    >
      <SaveToCrate release={release} crate={crate} />
      <DownloadSources release={release} audio={audio} />
    </ReleaseDetails>
  );
}
