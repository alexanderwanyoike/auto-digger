export const identityResponse = { id: 42, username: 'quiet-digger' };

export const releaseResponse = {
  id: 12,
  title: 'Quiet Orbit EP',
  artists: [{ name: 'Low Tide' }],
  labels: [{ name: 'Still Records', catno: 'ST001' }],
  year: 1998,
  country: 'UK',
  genres: ['Electronic'],
  styles: ['Deep House'],
  formats: [{ name: 'Vinyl', descriptions: ['12"', 'EP'] }],
  images: [{ type: 'primary', uri: 'https://i.discogs.com/example.jpg' }],
  tracklist: [{ position: 'A1', title: 'Quiet Orbit', duration: '6:12' }],
  videos: [{ title: 'Low Tide - Quiet Orbit', uri: 'https://www.youtube.com/watch?v=abcdefghijk' }],
};

export const loadedRelease = {
  id: 12,
  title: 'Quiet Orbit EP',
  artists: ['Low Tide'],
  labels: [{ name: 'Still Records', catalogueNumber: 'ST001' }],
  year: 1998,
  country: 'UK',
  genres: ['Electronic'],
  styles: ['Deep House'],
  formats: ['Vinyl, 12", EP'],
  artworkUrl: null,
  tracks: [{ position: 'A1', title: 'Quiet Orbit', duration: '6:12' }],
  videos: [{ title: 'Low Tide - Quiet Orbit', url: 'https://www.youtube.com/watch?v=abcdefghijk' }],
};
