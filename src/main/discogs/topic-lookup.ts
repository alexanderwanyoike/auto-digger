import { z } from 'zod';
import type { FollowTopic } from '../../shared/following';
import { followTopicKey } from '../../shared/following';
import { requestDiscogs } from './request';
import type { DiscogsRequestOptions } from './request';
import { supportedUrl } from './media-url';

const matches = z.object({
  results: z.array(
    z.object({
      id: z.number().int().positive().optional(),
      title: z.string(),
      cover_image: z.string().default(''),
      thumb: z.string().default(''),
    }),
  ),
});

export interface DiscogsTopic {
  id: number | undefined;
  artworkUrl: string | null;
}

export async function lookupDiscogsTopic(
  topic: FollowTopic,
  token: string,
  request: typeof fetch,
  options: DiscogsRequestOptions,
) {
  const query = new URLSearchParams({ type: topic.kind, q: topic.name, per_page: '50' });
  const result = await requestDiscogs(
    `/database/search?${query.toString()}`,
    token,
    matches,
    request,
    options,
  );
  if (!result.ok) return result;
  const exact = result.value.results.find(
    ({ title }) => followTopicKey({ kind: topic.kind, name: title }) === followTopicKey(topic),
  );
  const hosts = ['i.discogs.com', 'img.discogs.com'];
  const value: DiscogsTopic | null = exact
    ? {
        id: exact.id,
        artworkUrl: supportedUrl(exact.thumb, hosts) ?? supportedUrl(exact.cover_image, hosts),
      }
    : null;
  return { ok: true as const, value };
}
