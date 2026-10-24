import type { DiscogsBridge } from './discogs';

declare global {
  interface Window {
    discogs?: DiscogsBridge;
  }
}
