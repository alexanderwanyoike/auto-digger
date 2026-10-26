import type { DownloadProgress } from '../../shared/download-jobs';

export const downloadLabels: Record<DownloadProgress['stage'], string> = {
  queued: 'Queued',
  preparing: 'Preparing',
  downloading: 'Downloading',
  converting: 'Converting to MP3',
  tagging: 'Writing Discogs tags',
  complete: 'Saved',
  failed: 'Could not download',
  cancelled: 'Cancelled',
  cancelling: 'Cancelling…',
};
