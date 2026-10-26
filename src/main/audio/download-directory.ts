import { join } from 'node:path';
import type { DiscogsRelease } from '../../shared/discogs';
import type { Preferences } from '../../shared/preferences';
import { filenamePart } from './filenamePart';
import { parseFolderTemplate, renderFolderTemplate } from '../../shared/folder-template';
import type { Result } from '../../shared/result';

function folderPart(value: string): string {
  const safe = filenamePart(value).trim();
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(safe) ? `_${safe}` : safe;
}

export function downloadDirectory(
  root: string,
  preferences: Pick<Preferences, 'layout' | 'folders' | 'folderTemplate'>,
  release: DiscogsRelease,
  source: 'YouTube' | 'Soulseek',
): Result<string, { message: string }> {
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
  if (preferences.layout === 'custom' && preferences.folderTemplate !== undefined) {
    const template = parseFolderTemplate(preferences.folderTemplate);
    if (!template.ok) return template;
    const releaseId = `[r${release.id.toString()}]`;
    const rendered = renderFolderTemplate(preferences.folderTemplate, {
      source,
      genre: folderPart(values.genre),
      year: values.year,
      label: folderPart(values.label),
      artist: folderPart(values.artist),
      release: `${filenamePart(release.title)} ${releaseId}`,
    });
    if (!rendered.ok) return rendered;
    const segments = rendered.value.map((segment, index) => {
      const safe = folderPart(segment);
      return template.value[index]?.includes('<release>') && !safe.includes(releaseId)
        ? `${safe} ${releaseId}`
        : safe;
    });
    return { ok: true, value: join(root, ...segments) };
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
