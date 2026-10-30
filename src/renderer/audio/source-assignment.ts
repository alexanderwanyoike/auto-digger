import type { DiscogsRelease } from '../../shared/discogs';
import type { AudioResult, AudioSource, LocalTrack } from '../../shared/audio';
import { matchTrack } from '../../shared/match-track';

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
  const cosineTrackIndex = release.videos[index]?.cosineTrackIndex;
  const proposed =
    cosineTrackIndex === undefined ? matchTrack(release, sourceTitle) : cosineTrackIndex;
  const suggestion = saved ? saved.trackIndex : proposed;
  const assignment = manual === undefined ? suggestion : manual;
  const selected = assignment !== null && release.tracks[assignment] ? assignment : null;
  return { sourceTitle, selected };
}
