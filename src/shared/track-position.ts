import type { LocalTrack } from './audio';
import type { DiscogsRelease } from './discogs';

export function trackPosition(release: DiscogsRelease, index: number) {
  const track = release.tracks[index];
  if (!track) return null;
  const occurrence = release.tracks
    .slice(0, index)
    .filter(({ position, title }) => position === track.position && title === track.title).length;
  return { position: track.position, title: track.title, occurrence };
}

export function trackPositionKey(release: DiscogsRelease, index: number | null | undefined) {
  if (index == null) return undefined;
  const track = trackPosition(release, index);
  return track ? JSON.stringify([track.position, track.title, track.occurrence]) : undefined;
}

export function matchesTrackPosition(
  saved: Pick<LocalTrack, 'trackIndex' | 'trackPosition'>,
  release: DiscogsRelease,
  index: number | null,
) {
  return saved.trackPosition === undefined
    ? saved.trackIndex === index
    : saved.trackPosition === trackPositionKey(release, index);
}
