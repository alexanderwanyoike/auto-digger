import type { DownloadProgress } from '../../shared/download-jobs';

export interface DownloadOptions {
  signal?: AbortSignal;
  onProgress?: (progress: DownloadProgress) => void;
}
