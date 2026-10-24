import { z } from 'zod';
import { searchInputSchema } from '../../shared/search';
import type { DiscogsResult } from '../../shared/discogs';
import type { SearchPage } from '../../shared/search';
import { discogsFailure } from '../../shared/discogsFailure';
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
    })),
  }));

export async function searchDiscogs(
  input: unknown,
  token: string,
  request: typeof fetch,
): Promise<DiscogsResult<SearchPage>> {
  const parsed = searchInputSchema.safeParse(input);
  if (!parsed.success)
    return discogsFailure(
      'invalid-input',
      'Use a four-digit year and filters of at most 160 characters.',
    );
  const { filters, page } = parsed.data;
  const query = new URLSearchParams({
    type: 'release',
    format: 'EP',
    per_page: '50',
    page: page.toString(),
  });
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key === 'title' ? 'release_title' : key, value);
  });
  return requestDiscogs(`/database/search?${query.toString()}`, token, responseSchema, request);
}
