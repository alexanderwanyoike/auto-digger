import { z } from 'zod';
import type { DigResult } from './dig';
import type { DigFilters, SearchPage } from './search';
import type { Result } from './result';

export const accountSchema = z.object({
  id: z.number().int().positive(),
  username: z.string().min(1),
});
export type DiscogsAccount = z.infer<typeof accountSchema>;

export const discogsErrorSchema = z.object({
  code: z.enum([
    'invalid-input',
    'unauthorized',
    'rate-limited',
    'not-found',
    'network',
    'invalid-response',
    'unavailable',
    'cancelled',
    'exhausted',
    'credential-storage',
  ]),
  message: z.string(),
});
export type DiscogsError = z.infer<typeof discogsErrorSchema>;
export type DiscogsResult<T> = Result<T, DiscogsError>;

export const releaseSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  artists: z.array(z.string()),
  labels: z.array(z.object({ name: z.string(), catalogueNumber: z.string() })),
  year: z.number().int().positive().nullable(),
  country: z.string().nullable(),
  genres: z.array(z.string()),
  styles: z.array(z.string()),
  formats: z.array(z.string()),
  artworkUrl: z.string().nullable(),
  tracks: z.array(z.object({ position: z.string(), title: z.string(), duration: z.string() })),
  videos: z.array(z.object({ title: z.string(), url: z.string() })),
});
export type DiscogsRelease = z.infer<typeof releaseSchema>;

export interface DiscogsBridge {
  account: () => Promise<DiscogsResult<DiscogsAccount | null>>;
  connect: (token: string) => Promise<DiscogsResult<DiscogsAccount>>;
  dig: (input: {
    filters: DigFilters;
    reset: boolean;
    context?: 'artist';
  }) => Promise<DiscogsResult<DigResult>>;
  search: (input: {
    filters: DigFilters;
    page: number;
    context?: 'artist';
  }) => Promise<DiscogsResult<SearchPage>>;
  loadRelease: (id: number) => Promise<DiscogsResult<DiscogsRelease>>;
  disconnect: () => Promise<DiscogsResult<undefined>>;
  openSettings: () => Promise<DiscogsResult<undefined>>;
}

export const discogsChannels = {
  dig: 'discogs:dig',
  search: 'discogs:search',
  account: 'discogs:account',
  connect: 'discogs:connect',
  loadRelease: 'discogs:load-release',
  disconnect: 'discogs:disconnect',
  openSettings: 'discogs:open-settings',
} as const;
