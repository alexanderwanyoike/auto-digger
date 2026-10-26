import { join } from 'node:path';
import type { DiscogsRelease } from '../../shared/discogs';
import type { Preferences } from '../../shared/preferences';
import { filenamePart } from './filename-part';
import { renderFolderTemplate } from '../../shared/folder-template';
import { folderPart } from '../../shared/filename-part';
import type { Result } from '../../shared/result';

export function downloadDirectory(
  root: string,
  preferences: Pick<Preferences, 'layout' | 'folders' | 'folderTemplate'>,
  release: DiscogsRelease,
  source: 'YouTube' | 'Soulseek',
): Result<string, { message: string }> {
  const genre = release.genres[0]?.trim();
  const subgenre = release.styles[0]?.trim();
  const label = release.labels[0]?.name.trim();
  const values = {
    source,
    genre: genre?.length ? genre : 'Unknown genre',
    subgenre: subgenre?.length ? subgenre : 'Unknown subgenre',
    year: release.year?.toString() ?? 'Unknown year',
    label: label?.length ? label : 'Unknown label',
    artist: release.artists.join(', ') || 'Unknown artist',
    release: `${filenamePart(release.artists.join(', '))} - ${filenamePart(release.title)} [r${release.id.toString()}]`,
  };
  if (preferences.layout === 'custom' && preferences.folderTemplate !== undefined) {
    const releaseId = `[r${release.id.toString()}]`;
    const rendered = renderFolderTemplate(preferences.folderTemplate, {
      source,
      genre: folderPart(values.genre),
      subgenre: folderPart(values.subgenre),
      year: values.year,
      label: folderPart(values.label),
      artist: folderPart(values.artist),
      release: `${filenamePart(release.title)} ${releaseId}`,
    });
    if (!rendered.ok) return rendered;
    return { ok: true, value: join(root, ...rendered.value) };
  }
  const fields = preferences.layout === 'custom' ? (preferences.folders ?? []) : [];
  if (preferences.layout === 'release') return { ok: true, value: join(root, values.release) };
  return {
    ok: true,
    value: join(
      root,
      ...fields.map((field) => (field === 'release' ? values.release : folderPart(values[field]))),
    ),
  };
}
