import { join } from 'node:path';
import type { DiscogsRelease } from '../../shared/discogs';
import type { Preferences } from '../../shared/preferences';
import { filenamePart } from './filenamePart';

export function downloadDirectory(
  root: string,
  preferences: Pick<Preferences, 'layout' | 'folders'>,
  release: DiscogsRelease,
  source: 'YouTube' | 'Soulseek',
): string {
  const values = {
    source,
    genre: release.genres[0]?.trim() || 'Unknown genre',
    year: release.year?.toString() ?? 'Unknown year',
    label: release.labels[0]?.name.trim() || 'Unknown label',
    artist: release.artists.join(', ') || 'Unknown artist',
    release: `${filenamePart(release.artists.join(', '))} - ${filenamePart(release.title)} [r${release.id.toString()}]`,
  };
  const fields = preferences.layout === 'custom' ? (preferences.folders ?? []) : [];
  if (preferences.layout === 'release') return join(root, values.release);
  return join(
    root,
    ...fields.map((field) => (field === 'release' ? values.release : filenamePart(values[field]))),
  );
}
