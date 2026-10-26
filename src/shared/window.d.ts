import type { SavedFiltersBridge } from './savedFilters';
import type { UpdatesBridge } from './updates';
import type { ResearchAccessBridge } from './researchAccess';
import type { DownloadJobsBridge } from './downloadJobs';
import type { PreferencesBridge } from './preferences';
import type { StoreLinksBridge } from './storeLinks';
import type { CrateBridge } from './crate';
import type { DiscogsBridge } from './discogs';
import type { CatalogueBridge } from './catalogue';
import type { AudioBridge } from './audio';
import type { SoulseekBridge } from './soulseek';

declare global {
  interface Window {
    soulseek?: SoulseekBridge;
    savedFilters?: SavedFiltersBridge;
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
