import { z } from 'zod';
import type { DiscogsRelease } from '../../shared/discogs';

interface RemoteTrack {
  position: string;
  title: string;
  duration: string;
  sub_tracks: RemoteTrack[];
}

const trackMetadataSchema: z.ZodType<RemoteTrack> = z.lazy(() =>
  z.object({
    position: z.string().default(''),
    title: z.string(),
    duration: z.string().default(''),
    sub_tracks: z.array(trackMetadataSchema).default([]),
  }),
);

function flattenTracks(tracks: RemoteTrack[]): DiscogsRelease['tracks'] {
  return tracks.flatMap(({ sub_tracks: children, ...track }) => [
    track,
    ...flattenTracks(children),
  ]);
}

function supportedUrl(value: string, hosts: string[]): string | null {
  if (!URL.canParse(value)) return null;
  const url = new URL(value);
  return url.protocol === 'https:' && hosts.includes(url.hostname) ? url.href : null;
}

export const releaseMetadataSchema = z
  .object({
    id: z.number().int().positive(),
    title: z.string().min(1),
    artists: z.array(z.object({ name: z.string() })).default([]),
    labels: z.array(z.object({ name: z.string(), catno: z.string().default('') })).default([]),
    year: z.number().int().nonnegative().default(0),
    country: z.string().default(''),
    genres: z.array(z.string()).default([]),
    styles: z.array(z.string()).default([]),
    formats: z
      .array(z.object({ name: z.string(), descriptions: z.array(z.string()).default([]) }))
      .default([]),
    images: z.array(z.object({ type: z.string().optional(), uri: z.string() })).default([]),
    tracklist: z.array(trackMetadataSchema).default([]),
    videos: z.array(z.object({ title: z.string(), uri: z.string() })).default([]),
  })
  .transform((release): DiscogsRelease => {
    const artwork = release.images.find((image) => image.type === 'primary') ?? release.images[0];
    return {
      id: release.id,
      title: release.title,
      artists: release.artists.map((artist) => artist.name),
      labels: release.labels.map((label) => ({ name: label.name, catalogueNumber: label.catno })),
      year: release.year || null,
      country: release.country || null,
      genres: release.genres,
      styles: release.styles,
      formats: release.formats.map((format) => [format.name, ...format.descriptions].join(', ')),
      artworkUrl: artwork ? supportedUrl(artwork.uri, ['i.discogs.com', 'img.discogs.com']) : null,
      tracks: flattenTracks(release.tracklist),
      videos: release.videos.flatMap((video) => {
        const url = supportedUrl(video.uri, ['www.youtube.com', 'youtube.com', 'youtu.be']);
        return url ? [{ title: video.title, url }] : [];
      }),
    };
  });
