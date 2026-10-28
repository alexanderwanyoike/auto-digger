import type { SavedFiltersBridge } from './saved-filters';
import type { UpdatesBridge } from './updates';
import type { ResearchAccessBridge } from './research-access';
import type { DownloadJobsBridge } from './download-jobs';
import type { PreferencesBridge } from './preferences';
import type { StoreLinksBridge } from './store-links';
import type { CrateBridge } from './crate';
import type { DiscogsBridge } from './discogs';
import type { CatalogueBridge } from './catalogue';
import type { AudioBridge } from './audio';
import type { AudioPreviewBridge } from './audio-previews';
import type { SoulseekBridge } from './soulseek';
import type { ApiFeasibilityBridge } from './api-feasibility-prototype';

declare global {
  interface Window {
    apiFeasibility?: ApiFeasibilityBridge;
    audioPreviews?: AudioPreviewBridge;
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
