import { z } from 'zod';
import type { FollowTopic } from '../../shared/following';
import type { SearchPage } from '../../shared/search';
import { supportedUrl } from './media-url';
import { requestDiscogs } from './request';
import type { DiscogsRequestOptions } from './request';

const catalogue = z.object({
  pagination: z.object({
    page: z.number().int().positive(),
    pages: z.number().int().nonnegative(),
    per_page: z.number().int().min(1).max(100),
    items: z.number().int().nonnegative(),
  }),
  releases: z.array(
    z.object({
      id: z.number().int().positive(),
      title: z.string(),
      artist: z.string().nullish(),
      year: z.number().int().nullish(),
      type: z.string().optional(),
      main_release: z.number().int().nullish(),
      format: z.string().nullish(),
      label: z.string().nullish(),
      thumb: z.string().nullish(),
    }),
  ),
});

export async function loadTopicReleases(
  topic: FollowTopic,
  id: number,
  page: number,
  token: string,
  request: typeof fetch,
  options: DiscogsRequestOptions,
) {
  const query = new URLSearchParams({ page: page.toString(), per_page: '50' });
  const group = topic.kind === 'label' ? 'labels' : 'artists';
  const result = await requestDiscogs(
    `/${group}/${id.toString()}/releases?${query.toString()}`,
    token,
    catalogue,
    request,
    options,
  );
  if (!result.ok) return result;
  const { pagination, releases } = result.value;
  const seen = new Set<number>();
  const records: SearchPage['releases'] = releases.flatMap((item) => {
    const releaseId = item.type === 'master' ? item.main_release : item.id;
    if (!releaseId || releaseId < 1 || seen.has(releaseId)) return [];
    seen.add(releaseId);
    const title = item.title.trim();
    const label = topic.kind === 'label' ? topic.name : item.label;
    return [
      {
        id: releaseId,
        title: item.artist ? `${item.artist} - ${title}` : title,
        year: item.year ? item.year.toString() : '',
        labels: label ? [label] : [],
        formats: item.format ? [item.format] : [],
        artworkUrl: supportedUrl(item.thumb ?? '', ['i.discogs.com', 'img.discogs.com']),
      },
    ];
  });
  return {
    ok: true as const,
    value: {
      page: pagination.page,
      pages: pagination.pages,
      perPage: pagination.per_page,
      items: pagination.items,
      releases: records,
    },
  };
}
