import type { CrateBridge } from './crate';
import type { DiscogsBridge } from './discogs';
import type { AudioBridge } from './audio';

declare global {
  interface Window {
    discogs?: DiscogsBridge;
    crate?: CrateBridge;
    audioLibrary?: AudioBridge;
  }
}
