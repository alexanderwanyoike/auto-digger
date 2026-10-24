import type { DownloadProgress } from '../../shared/downloadJobs';

export interface DownloadOptions {
  signal?: AbortSignal;
  onProgress?: (progress: DownloadProgress) => void;
}
