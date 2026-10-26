import type { Result } from './result';

export const folderFields = ['source', 'genre', 'year', 'label', 'artist', 'release'] as const;
export type FolderField = (typeof folderFields)[number];
type TemplateResult<T> = Result<T, { message: string }>;

export function parseFolderTemplate(input: string): TemplateResult<string[]> {
  const failure = (message: string): TemplateResult<string[]> => ({
    ok: false,
    error: { message },
  });
  if (input.length > 1024) return failure('Keep the folder layout under 1,024 characters.');
  const template = input.trim();
  if (/^(?:[/\\]|[a-z]:)/i.test(template))
    return failure('Use a relative layout. Choose the downloads folder above.');
  const segments = template
    .split(/[/\\]/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length > 12) return failure('Use at most 12 folder levels.');
  const invalid = segments.find((segment) => segment === '.' || segment === '..');
  if (invalid) return failure('Folder layouts cannot contain . or .. path segments.');
  const placeholders = [...template.matchAll(/<([^<>]+)>/g)];
  const unknown = placeholders.find((match) => !folderFields.some((field) => field === match[1]));
  if (unknown)
    return failure(`Unknown placeholder ${unknown[0]}. Use one of the placeholders below.`);
  const literals = template.replace(/<(source|genre|year|label|artist|release)>/g, '');
  if (/[<>:"|?*\p{Cc}]/u.test(literals))
    return failure(
      'Use complete placeholders such as <artist>, and avoid invalid folder characters.',
    );
  return { ok: true, value: segments };
}

export function renderFolderTemplate(
  template: string,
  values: Record<FolderField, string>,
): TemplateResult<string[]> {
  const parsed = parseFolderTemplate(template);
  if (!parsed.ok) return parsed;
  const replacements = new Map(Object.entries(values));
  return {
    ok: true,
    value: parsed.value.map((segment) =>
      segment.replace(
        /<([^<>]+)>/g,
        (token: string, field: string) => replacements.get(field) ?? token,
      ),
    ),
  };
}

export function currentFolderTemplate(preferences: {
  layout: 'flat' | 'release' | 'custom';
  folderTemplate?: string | undefined;
  folders?: FolderField[] | undefined;
}): string {
  if (preferences.layout === 'flat') return '';
  if (preferences.layout === 'release') return '<artist> - <release>';
  return (
    preferences.folderTemplate ??
    (preferences.folders ?? [])
      .map((field) => (field === 'release' ? '<artist> - <release>' : `<${field}>`))
      .join('/')
  );
}
