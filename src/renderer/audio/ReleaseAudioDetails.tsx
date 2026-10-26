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
}: {
  release: DiscogsRelease;
  audio: ReturnType<typeof useAudioLibrary>;
  crate: ReturnType<typeof useCrate>;
}) {
  return (
    <ReleaseDetails release={release}>
      <SaveToCrate release={release} crate={crate} />
      <DownloadSources release={release} audio={audio} />
    </ReleaseDetails>
  );
}
