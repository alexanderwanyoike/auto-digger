import type { LibraryRow } from './rows';

export const sourceLabels = { youtube: 'YouTube', soulseek: 'Soulseek' } as const;
export type DownloadProvider = keyof typeof sourceLabels;
export type DownloadSourceFilter = DownloadProvider | 'all';

export function rowProvider(row: LibraryRow): DownloadProvider {
  return (
    row.track?.provider ?? (/^[1-9]\d*-slsk-[a-f0-9]{32}$/.test(row.id) ? 'soulseek' : 'youtube')
  );
}
