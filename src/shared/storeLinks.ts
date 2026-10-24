import type { Result } from './result';
import type { DiscogsRelease } from './discogs';

export const storePlatforms = ['discogs', 'beatport', 'traxsource', 'bandcamp'] as const;
export type StorePlatform = (typeof storePlatforms)[number];
export interface StoreLinkError {
  code: 'invalid-input' | 'unavailable';
  message: string;
}
export type StoreLinkResult<T> = Result<T, StoreLinkError>;
export interface StoreLinksBridge {
  open: (platform: StorePlatform, release: DiscogsRelease) => Promise<StoreLinkResult<undefined>>;
}
