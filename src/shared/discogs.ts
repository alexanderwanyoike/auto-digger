import { z } from 'zod';
import type { DiscoveryPage, DiscoveryPageRequest } from './discovery';
import type { DigResult } from './dig';
import type { DigFilters, SearchInput, SearchPage } from './search';
import type { HistoryEntry, HistoryRecord } from './discovery-history';
import type { FollowTopic } from './following';
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
  videos: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      cosineTrackIndex: z.number().int().nonnegative().nullable().optional(),
    }),
  ),
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
  search: (input: SearchInput) => Promise<DiscogsResult<SearchPage>>;
  topicArtwork?: (topic: FollowTopic) => Promise<DiscogsResult<string | null>>;
  discover?: (topic: FollowTopic | null) => Promise<DiscogsResult<SearchPage['releases']>>;
  expandDiscovery?: (input: DiscoveryPageRequest) => Promise<DiscogsResult<DiscoveryPage>>;
  starterShelf?: () => Promise<DiscogsResult<SearchPage['releases']>>;
  previewRelease?: (id: number) => Promise<DiscogsResult<DiscogsRelease>>;
  crateStyles?: () => Promise<DiscogsResult<string[]>>;
  discoveryHistory?: () => Promise<DiscogsResult<HistoryEntry[]>>;
  recordDiscovery?: (entry: HistoryRecord) => Promise<DiscogsResult<undefined>>;
  markSeen?: (id: number) => Promise<DiscogsResult<undefined>>;
  loadRelease: (id: number) => Promise<DiscogsResult<DiscogsRelease>>;
  disconnect: () => Promise<DiscogsResult<undefined>>;
  openSettings: () => Promise<DiscogsResult<undefined>>;
}

export const discogsChannels = {
  dig: 'discogs:dig',
  search: 'discogs:search',
  topicArtwork: 'discogs:topic-artwork',
  discover: 'discogs:discover',
  starterShelf: 'discogs:starter-shelf',
  expandDiscovery: 'discogs:expand-discovery',
  markSeen: 'discogs:mark-seen',
  discoveryHistory: 'discogs:discovery-history',
  recordDiscovery: 'discogs:record-discovery',
  previewRelease: 'discogs:preview-release',
  crateStyles: 'discogs:crate-styles',
  account: 'discogs:account',
  connect: 'discogs:connect',
  loadRelease: 'discogs:load-release',
  disconnect: 'discogs:disconnect',
  openSettings: 'discogs:open-settings',
} as const;
