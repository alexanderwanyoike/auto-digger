import type { DiscogsRelease } from '../../shared/discogs';
import type { useAudioLibrary } from './use-audio-library';
import type { useCrate } from '../crate/use-crate';
import { SaveToCrate } from '../crate/SaveToCrate';
import { ReleaseDetails } from '../discogs/ReleaseDetails';
import { DownloadSources } from './DownloadSources';

export function ReleaseAudioDetails({
  release,
  audio,
  crate,
  onBrowseArtist,
  artistBrowsingDisabled,
}: {
  release: DiscogsRelease;
  audio: ReturnType<typeof useAudioLibrary>;
  crate: ReturnType<typeof useCrate>;
  onBrowseArtist: (artist: string) => void;
  artistBrowsingDisabled: boolean;
}) {
  return (
    <ReleaseDetails
      release={release}
      onBrowseArtist={onBrowseArtist}
      artistBrowsingDisabled={artistBrowsingDisabled}
    >
      <SaveToCrate release={release} crate={crate} />
      <DownloadSources release={release} audio={audio} />
    </ReleaseDetails>
  );
}
