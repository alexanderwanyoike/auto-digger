import type { DiscogsRelease } from '../../../shared/discogs';
import { demoTracks } from './demoData';
import artwork from './quietOrbit.svg';

export const demoRelease: DiscogsRelease = {
  id: 12,
  title: 'Quiet Orbit EP',
  artists: ['Low Tide'],
  labels: [{ name: 'Still Records', catalogueNumber: 'ST001' }],
  year: 1998,
  country: 'UK',
  genres: ['Electronic'],
  styles: ['Deep House'],
  formats: ['Vinyl, 12", EP'],
  artworkUrl: artwork,
  tracks: demoTracks.slice(0, 2).map((track) => ({
    title: track.title,
    position: track.position,
    duration: '7:14',
  })),
  videos: [
    {
      title: 'Low Tide - Quiet Orbit (Original Mix)',
      url: 'https://www.youtube.com/watch?v=abcdefghijk',
    },
    { title: 'Low Tide - Evening Drift', url: 'https://www.youtube.com/watch?v=lmnopqrstuv' },
  ],
};
