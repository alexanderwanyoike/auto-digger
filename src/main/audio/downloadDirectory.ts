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
  const genre = release.genres[0]?.trim();
  const label = release.labels[0]?.name.trim();
  const values = {
    source,
    genre: genre?.length ? genre : 'Unknown genre',
    year: release.year?.toString() ?? 'Unknown year',
    label: label?.length ? label : 'Unknown label',
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
