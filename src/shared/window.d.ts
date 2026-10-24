import type { CrateBridge } from './crate';
import type { DiscogsBridge } from './discogs';

declare global {
  interface Window {
    discogs?: DiscogsBridge;
    crate?: CrateBridge;
  }
}
