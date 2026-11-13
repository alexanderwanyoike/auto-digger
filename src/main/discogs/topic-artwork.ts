import { z } from 'zod';
import type { FollowTopic } from '../../shared/following';
import { followTopicKey } from '../../shared/following';
import { requestDiscogs } from './request';
import type { DiscogsRequestOptions } from './request';
import { supportedUrl } from './media-url';

const artworkMatches = z.object({
  results: z.array(
    z.object({
      title: z.string(),
      cover_image: z.string().default(''),
      thumb: z.string().default(''),
    }),
  ),
});

export async function searchTopicArtwork(
  topic: FollowTopic,
  token: string,
  request: typeof fetch,
  options: DiscogsRequestOptions,
) {
  const query = new URLSearchParams({ type: topic.kind, q: topic.name, per_page: '10' });
  const result = await requestDiscogs(
    `/database/search?${query.toString()}`,
    token,
    artworkMatches,
    request,
    options,
  );
  if (!result.ok) return result;
  const exact = result.value.results.find(
    ({ title }) => followTopicKey({ kind: topic.kind, name: title }) === followTopicKey(topic),
  );
  const hosts = ['i.discogs.com', 'img.discogs.com'];
  return {
    ok: true as const,
    value: exact
      ? (supportedUrl(exact.thumb, hosts) ?? supportedUrl(exact.cover_image, hosts))
      : null,
  };
}
