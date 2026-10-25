import type { UpdatesBridge } from './updates';
import type { ResearchAccessBridge } from './researchAccess';
import type { DownloadJobsBridge } from './downloadJobs';
import type { PreferencesBridge } from './preferences';
import type { StoreLinksBridge } from './storeLinks';
import type { CrateBridge } from './crate';
import type { DiscogsBridge } from './discogs';
import type { CatalogueBridge } from './catalogue';
import type { AudioBridge } from './audio';

declare global {
  interface Window {
    updates?: UpdatesBridge;
    researchAccess?: ResearchAccessBridge;
    downloadJobs?: DownloadJobsBridge;
    preferences?: PreferencesBridge;
    storeLinks?: StoreLinksBridge;
    discogs?: DiscogsBridge;
    crate?: CrateBridge;
    catalogue?: CatalogueBridge;
    audioLibrary?: AudioBridge;
  }
}
