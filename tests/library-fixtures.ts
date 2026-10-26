import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { LocalTrack } from '../src/shared/audio';

export async function seedLibrary(directory: string): Promise<LocalTrack[]> {
  await mkdir(directory, { recursive: true });
  const titles = [
    'Quiet Orbit',
    'Black Sand',
    'Coastline',
    'Open Water',
    'Sub Surface',
    'Dusk Dub',
  ];
  const artists = [
    'Low Tide',
    'Northern Relay',
    'Low Tide',
    'Northern Relay',
    'Marrow',
    'Broken Signals',
  ];
  const albums = [
    'Quiet Orbit EP',
    'Small Hours',
    'Coastal Forms',
    'Small Hours',
    'Deep Cuts',
    'Dusk Dub',
  ];
  const tracks: LocalTrack[] = titles.map((title, index) => ({
    id: `${(200 + index).toString()}-abcdefghijk`,
    releaseId: 200 + index,
    videoId: 'abcdefghijk',
    title,
    sourceTitle: title,
    trackIndex: 0,
    artist: artists[index] ?? '',
    album: albums[index] ?? '',
    artworkUrl: `https://i.discogs.com/library-fixture-${index.toString()}.jpg`,
    filename: `${title}.yt.mp3`,
    warning: index === 2 ? 'The track artist could not be confirmed from this source.' : null,
  }));
  await Promise.all(
    tracks.map(async (track) => {
      await copyFile(resolve('tests/fixtures/tone.mp3'), join(directory, track.filename));
      await writeFile(join(directory, `${track.id}.json`), JSON.stringify({ version: 1, track }));
    }),
  );
  return tracks;
}
