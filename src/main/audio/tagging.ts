import { copyFile, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import NodeID3 from 'node-id3';
import type { DiscogsRelease } from '../../shared/discogs';
import type { AudioResult } from '../../shared/audio';
import { fetchArtwork } from './artwork';
import { matchTrack } from '../../shared/matchTrack';

export async function tagDownload(
  file: string,
  release: DiscogsRelease,
  videoTitle: string,
  options: { request?: typeof fetch; trackIndex?: number | null | undefined } = {},
): Promise<AudioResult<{ title: string; warning: string | null }>> {
  const { trackIndex, request = fetch } = options;
  const index = trackIndex === undefined ? matchTrack(release, videoTitle) : trackIndex;
  const match = index === null ? undefined : release.tracks[index];
  const title = match?.title ?? videoTitle;
  const notices: string[] = [];
  if (!match)
    notices.push('Track-specific tags could not be matched confidently; the video title was kept.');
  const tags: NodeID3.Tags = {
    title,
    album: release.title,
    artist: release.artists.join(' / '),
    performerInfo: release.artists.join(' / '),
    genre: [...new Set([...release.genres, ...release.styles])].join(' / '),
    publisher: release.labels.map((label) => label.name).join(' / '),
    userDefinedUrl: [
      {
        description: 'Discogs release',
        url: `https://www.discogs.com/release/${release.id.toString()}`,
      },
    ],
  };
  if (release.year) tags.year = release.year.toString();
  if (match) tags.trackNumber = (release.tracks.indexOf(match) + 1).toString();
  if (release.artworkUrl) {
    const artwork = await fetchArtwork(release.artworkUrl, request);
    if (artwork.ok)
      tags.image = {
        ...artwork.value,
        type: { id: 3 },
        description: release.title,
      };
    else notices.push('The audio is saved, but Discogs artwork could not be embedded.');
  } else notices.push('Discogs has no artwork for this release.');
  const temporary = `${file}.${randomUUID()}.tags`;
  try {
    await copyFile(file, temporary);
    await NodeID3.Promise.write(tags, temporary);
    await rename(temporary, file);
  } catch {
    notices.push('The audio is saved, but its ID3 tags could not be written.');
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined);
  }
  return { ok: true, value: { title, warning: notices.length ? notices.join(' ') : null } };
}
