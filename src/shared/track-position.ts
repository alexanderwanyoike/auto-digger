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
