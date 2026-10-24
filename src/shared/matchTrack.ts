import type { DiscogsRelease } from './discogs';

function normalise(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function matchTrack(release: DiscogsRelease, videoTitle: string): number | null {
  const normalised = ` ${normalise(videoTitle)} `;
  const matches = release.tracks
    .map((track, index) => ({ title: normalise(track.title), index }))
    .filter(({ title }) => title.length >= 3 && normalised.includes(` ${title} `));
  return matches.length === 1 ? (matches[0]?.index ?? null) : null;
}
