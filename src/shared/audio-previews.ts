import type { AudioResult, DownloadInput, LocalTrack } from './audio';

export const audioPreviewChannels = {
  prepare: 'audio:preview',
  cancel: 'audio:cancel-preview',
} as const;
export interface AudioPreviewBridge {
  prepare: (input: DownloadInput) => Promise<AudioResult<LocalTrack>>;
  cancel: (id: string) => Promise<AudioResult<undefined>>;
}
