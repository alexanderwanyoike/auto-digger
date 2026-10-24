import { z } from 'zod';
import type { Result } from './result';

export const installerSuffixes = {
  'windows-x64': 'windows-x64-setup.exe',
  'macos-arm64': 'macos-arm64.dmg',
  'macos-x64': 'macos-x64.dmg',
  'linux-x64': 'linux-x64.AppImage',
} as const;

const schema = z.object({
  tag_name: z.string().regex(/^v\d+\.\d+\.\d+$/),
  draft: z.literal(false),
  prerelease: z.literal(false),
  assets: z.array(
    z.object({
      name: z.string(),
      size: z.number().int().positive(),
      browser_download_url: z.string(),
    }),
  ),
});

export function publishedDownloads(
  input: unknown,
): Result<{ version: string; links: Record<string, string> & { checksums: string } }, string> {
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: 'Expected a published stable release with installer assets.' };
  const release = parsed.data;
  const version = release.tag_name.slice(1);
  const prefix = `https://github.com/alexanderwanyoike/auto-digger/releases/download/${release.tag_name}/`;
  const files = [
    ...Object.entries(installerSuffixes).map(
      ([target, suffix]) => [target, `AutoDigger-${version}-${suffix}`] as const,
    ),
    ['checksums', 'SHA256SUMS'] as const,
  ];
  const links: Record<string, string> & { checksums: string } = {};
  const complete = files.every(([target, name]) => {
    const matches = release.assets.filter((asset) => asset.name === name);
    const asset = matches[0];
    if (matches.length !== 1 || asset?.browser_download_url !== `${prefix}${name}`) return false;
    links[target] = asset.browser_download_url;
    return true;
  });
  return complete
    ? { ok: true, value: { version, links } }
    : {
        ok: false,
        error: 'The release must contain all four installers and SHA256SUMS at this repository.',
      };
}
