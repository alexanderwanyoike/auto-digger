import { expect, test, vi } from 'vitest';
import { createMacUpdateBackend } from './macBackend';
import { installerSuffixes } from '../../shared/releaseAssets';

test('offers the matching official Mac installer and opens it without a native installation', async () => {
  const prefix = 'https://github.com/alexanderwanyoike/auto-digger/releases/download/v0.2.0/';
  const names = [
    ...Object.values(installerSuffixes).map((suffix) => `AutoDigger-0.2.0-${suffix}`),
    'SHA256SUMS',
  ];
  const release = {
    tag_name: 'v0.2.0',
    draft: false,
    prerelease: false,
    assets: names.map((name) => ({ name, size: 100, browser_download_url: `${prefix}${name}` })),
  };
  const open = vi.fn().mockResolvedValue(undefined);
  const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(release)));
  const backend = createMacUpdateBackend('0.1.1', 'arm64', request, open);
  expect(backend.manual).toBe(true);
  expect(await backend.check()).toEqual({ ok: true, value: '0.2.0' });
  expect(await backend.download(() => undefined)).toMatchObject({ ok: true });
  expect(open).toHaveBeenCalledWith(`${prefix}AutoDigger-0.2.0-macos-arm64.dmg`);
  expect(await backend.install()).toMatchObject({ ok: false });
});
