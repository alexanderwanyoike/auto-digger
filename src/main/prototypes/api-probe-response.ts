import { z } from 'zod';
import type {
  ApiProbeInput,
  ApiProbeReport,
  ApiPrototypeResult,
} from '../../shared/api-feasibility-prototype';

const idSchema = z.union([z.string(), z.number()]).transform(String);
const cosineTrack = z
  .object({
    id: idSchema,
    artist: z.string(),
    track: z.string(),
    external_link: z.string().nullish(),
    video_uri: z.string().nullish(),
    score: z.number().optional(),
  })
  .loose();
const beatportRelease = z
  .object({
    id: idSchema,
    name: z.string(),
    slug: z.string().optional(),
    artists: z.array(z.object({ name: z.string() })).default([]),
  })
  .loose();
const bandcampBand = z
  .object({ band_id: idSchema, name: z.string(), subdomain: z.string() })
  .loose();

export function apiProbeResponse(
  input: ApiProbeInput,
  body: unknown,
): ApiPrototypeResult<Pick<ApiProbeReport, 'items' | 'fields' | 'note'>> {
  const invalid = {
    ok: false as const,
    error: {
      code: 'invalid-response' as const,
      message: 'The service responded, but its data does not match the checked API contract.',
    },
  };
  if (input.provider === 'cosine') {
    const schema = z.object({
      success: z.literal(true),
      data:
        input.operation === 'similar'
          ? z
              .object({ similar_tracks: z.array(cosineTrack) })
              .transform((value) => value.similar_tracks)
          : z.array(cosineTrack),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) return invalid;
    const unique = [...new Map(parsed.data.data.map((track) => [track.id, track])).values()].slice(
      0,
      10,
    );
    return {
      ok: true,
      value: {
        fields: Object.keys(unique[0] ?? {}),
        items: unique.map((track) => ({
          id: track.id,
          title: track.track,
          artist: track.artist,
          ...(track.external_link ? { sourceUrl: track.external_link } : {}),
          ...(track.video_uri ? { youtubeUrl: track.video_uri } : {}),
          ...(track.score === undefined ? {} : { score: track.score }),
        })),
        note:
          input.operation === 'similar'
            ? 'Live recommendation response. Similarity is not an exact recording match.'
            : 'Live API response. Choose a track before requesting recommendations.',
      },
    };
  }
  if (input.provider === 'beatport') {
    const parsed = z.object({ releases: z.array(beatportRelease) }).safeParse(body);
    if (!parsed.success) return invalid;
    return {
      ok: true,
      value: {
        fields: Object.keys(parsed.data.releases[0] ?? {}),
        items: parsed.data.releases.slice(0, 10).map((release) => ({
          id: release.id,
          title: release.name,
          artist: release.artists.map((artist) => artist.name).join(', '),
          ...(release.slug
            ? {
                sourceUrl: `https://www.beatport.com/release/${encodeURIComponent(release.slug)}/${encodeURIComponent(release.id)}`,
              }
            : {}),
        })),
        note: 'Live release search. Further filters and release details still need authenticated verification.',
      },
    };
  }
  const parsed = z.object({ bands: z.array(bandcampBand) }).safeParse(body);
  if (!parsed.success) return invalid;
  return {
    ok: true,
    value: {
      fields: Object.keys(parsed.data.bands[0] ?? {}),
      items: parsed.data.bands
        .slice(0, 10)
        .map((band) => ({ id: band.band_id, title: band.name, artist: band.subdomain })),
      note: 'Account access works. This does not prove catalogue search is available; the documented API covers managed bands, sales and merchandise.',
    },
  };
}
