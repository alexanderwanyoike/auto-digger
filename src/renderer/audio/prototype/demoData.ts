import type { Result } from '../../../shared/result';

export interface DemoTrack {
  id: string;
  position: string;
  title: string;
  artist: string;
  release: string;
  releaseId: number;
}
export interface DemoCandidate {
  id: string;
  trackId: string;
  provider: 'YouTube' | 'Soulseek';
  access: 'public' | 'private';
  owner: string;
  filename: string;
  quality: string;
  duration: string;
}
export const demoTracks: [DemoTrack, ...DemoTrack[]] = [
  {
    id: 'orbit-a1',
    position: 'A1',
    title: 'Quiet Orbit (Original Mix)',
    artist: 'Low Tide',
    release: 'Quiet Orbit EP',
    releaseId: 12,
  },
  {
    id: 'orbit-b1',
    position: 'B1',
    title: 'Evening Drift',
    artist: 'Low Tide',
    release: 'Quiet Orbit EP',
    releaseId: 12,
  },
];
export function demoCandidates(track: DemoTrack): DemoCandidate[] {
  return [
    {
      id: `${track.id}-youtube`,
      trackId: track.id,
      provider: 'YouTube',
      access: 'public',
      owner: 'harbour_tapes',
      filename: `${track.artist} - ${track.title}`,
      quality: 'YouTube audio',
      duration: '07:12',
    },
    {
      id: `${track.id}-soulseek`,
      trackId: track.id,
      provider: 'Soulseek',
      access: 'public',
      owner: 'tape_archive',
      filename: `${track.position} - ${track.title}.mp3`,
      quality: 'MP3 · 320 kbps',
      duration: '07:14',
    },
    {
      id: `${track.id}-private`,
      trackId: track.id,
      provider: 'Soulseek',
      access: 'private',
      owner: 'locked_crate',
      filename: `${track.artist} - ${track.title}.mp3`,
      quality: 'MP3 · 320 kbps',
      duration: '07:14',
    },
  ];
}
export function demoSoulseekResults(
  track: DemoTrack,
  scenario: string,
): Result<DemoCandidate[], { message: string }> {
  if (scenario === 'offline')
    return { ok: false, error: { message: 'Soulseek is not connected in this demo.' } };
  return {
    ok: true,
    value: demoCandidates(track).filter(
      (candidate) =>
        candidate.provider === 'Soulseek' &&
        scenario !== 'empty' &&
        (scenario !== 'private-only' || candidate.access === 'private'),
    ),
  };
}
