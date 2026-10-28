const { readFileSync, appendFileSync } = require('node:fs');
const { resolve } = require('node:path');

const source = {
  id: '1',
  artist: 'Low Tide',
  track: 'Quiet Orbit',
  video_uri: 'https://youtu.be/abcdefghijk',
  external_link: 'https://www.discogs.com/release/12',
};
const related = {
  id: '2',
  artist: 'Still Waters',
  track: 'Later Orbit (Club Mix)',
  video_uri: 'https://youtu.be/lmnopqrstuv',
  external_link: 'https://www.discogs.com/release/13',
};
globalThis.fetch = (input, init) => {
  const url = new URL(input);
  const headers = new Headers(init?.headers);
  if (url.origin === 'https://cosine.club') {
    if (headers.get('Authorization') !== 'Bearer synthetic-cosine-key')
      return Promise.resolve(Response.json({ success: false }, { status: 401 }));
    if (url.pathname === '/api/v1/tracks/lookup')
      return Promise.resolve(Response.json({ success: true, data: [source] }));
    return Promise.resolve(
      Response.json({
        success: true,
        data: {
          similar_tracks: [
            related,
            related,
            { ...related, id: '3' },
            { id: '4', artist: 'Still Waters', track: 'Later Orbit (Dub Mix)' },
          ],
        },
      }),
    );
  }
  if (url.origin === 'https://api.discogs.com' && url.pathname === '/oauth/identity')
    return Promise.resolve(Response.json({ id: 42, username: 'quiet-digger' }));
  if (url.origin === 'https://api.discogs.com') {
    if (headers.has('Authorization'))
      throw new Error('Unexpected credential on public metadata request');
    return Promise.resolve(
      Response.json({
        id: 13,
        title: 'Later EP',
        artists: [{ name: 'Still Waters' }],
        year: 2002,
        genres: ['Electronic'],
        styles: ['Deep House'],
        tracklist: [{ position: 'A1', title: related.track, duration: '6:00' }],
        videos: [],
      }),
    );
  }
  if (url.hostname === 'fixture.googlevideo.com') {
    if (process.env.AUTO_DIGGER_TEST_DOWNLOAD_LOG)
      appendFileSync(process.env.AUTO_DIGGER_TEST_DOWNLOAD_LOG, 'preview\n');
    return Promise.resolve(new Response(readFileSync(resolve(__dirname, 'fixtures/preview.webm'))));
  }
  throw new Error('Unexpected network request in recommendation fixture');
};
require('./encrypted-desktop.cjs');
