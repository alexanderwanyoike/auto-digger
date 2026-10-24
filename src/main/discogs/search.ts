import { z } from 'zod';
import { supportedUrl } from './mediaUrl';
import type { searchInputSchema, SearchPage } from '../../shared/search';
import type { DiscogsResult } from '../../shared/discogs';
import { requestDiscogs } from './request';

const responseSchema = z
  .object({
    pagination: z.object({
      page: z.number().int().positive(),
      pages: z.number().int().nonnegative(),
      per_page: z.number().int().min(1).max(100),
      items: z.number().int().nonnegative(),
    }),
    results: z.array(
      z.object({
        id: z.number().int().positive(),
        title: z.string().min(1),
        year: z.union([z.string(), z.number()]).optional(),
        label: z.array(z.string()).default([]),
        format: z.array(z.string()).default([]),
        cover_image: z.string().default(''),
        thumb: z.string().default(''),
      }),
    ),
  })
  .transform(({ pagination, results }) => ({
    page: pagination.page,
    pages: Math.min(pagination.pages, Math.ceil(10000 / pagination.per_page)),
    perPage: pagination.per_page,
    items: pagination.items,
    releases: results.map((release) => ({
      id: release.id,
      title: release.title,
      year: release.year?.toString() ?? '',
      labels: release.label,
      formats: release.format,
      artworkUrl:
        supportedUrl(release.cover_image, ['i.discogs.com', 'img.discogs.com']) ??
        supportedUrl(release.thumb, ['i.discogs.com', 'img.discogs.com']),
    })),
  }));

export async function searchDiscogs(
  input: z.infer<typeof searchInputSchema>,
  token: string,
  request: typeof fetch,
): Promise<DiscogsResult<SearchPage>> {
  const { filters, page } = input;
  const query = new URLSearchParams({
    type: 'release',
    format: 'EP',
    per_page: '50',
    page: page.toString(),
  });
  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length) query.set(key, value.join('|'));
    } else if (value) query.set(key === 'title' ? 'release_title' : key, value);
  });
  return requestDiscogs(`/database/search?${query.toString()}`, token, responseSchema, request);
}
