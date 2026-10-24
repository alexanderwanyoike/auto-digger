import type { DiscogsRelease } from '../../shared/discogs';
import type { AudioResult, AudioSource, LocalTrack } from '../../shared/audio';
import { matchTrack } from '../../shared/matchTrack';

export function sourceAssignment(
  release: DiscogsRelease,
  index: number,
  checked: AudioResult<AudioSource> | null | undefined,
  saved: LocalTrack | undefined,
  manual: number | null | undefined,
) {
  const sourceTitle = checked?.ok
    ? checked.value.title
    : (saved?.sourceTitle ?? release.videos[index]?.title ?? '');
  const suggestion = saved ? saved.trackIndex : matchTrack(release, sourceTitle);
  return { sourceTitle, selected: manual === undefined ? suggestion : manual };
}
