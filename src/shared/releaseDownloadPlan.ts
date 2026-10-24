import type { DiscogsRelease } from './discogs';

export interface ReleaseDownloadChoice {
  trackIndex: number;
  title: string;
  position: string;
  videoIndexes: number[];
  videoIndex: number | null;
  state: 'ready' | 'missing' | 'choose' | 'skipped';
}
export function releaseDownloadPlan(
  release: DiscogsRelease,
  assignments: (number | null)[],
  choices: Record<number, number | null>,
): ReleaseDownloadChoice[] {
  return release.tracks.map((track, trackIndex) => {
    const videoIndexes = assignments
      .slice(0, release.videos.length)
      .flatMap((assignment, videoIndex) => (assignment === trackIndex ? [videoIndex] : []));
    const choice = choices[trackIndex];
    let videoIndex: number | null = null;
    let state: ReleaseDownloadChoice['state'] = 'missing';
    if (videoIndexes.length) {
      if (choice === null) state = 'skipped';
      else if (choice !== undefined && videoIndexes.includes(choice)) {
        videoIndex = choice;
        state = 'ready';
      } else if (choice === undefined && videoIndexes.length === 1) {
        videoIndex = videoIndexes[0] ?? null;
        state = 'ready';
      } else state = 'choose';
    }
    return {
      trackIndex,
      title: track.title,
      position: track.position,
      videoIndexes,
      videoIndex,
      state,
    };
  });
}
