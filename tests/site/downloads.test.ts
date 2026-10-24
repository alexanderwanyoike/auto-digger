import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { expect, test } from 'vitest';

const suffixes = [
  'windows-x64-setup.exe',
  'macos-arm64.dmg',
  'macos-x64.dmg',
  'linux-x64.AppImage',
  'SHA256SUMS',
];

test('links to all four installers from a complete published release', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-release-site-'));
  try {
    const releaseFile = join(directory, 'release.json');
    const base = 'https://github.com/alexanderwanyoike/auto-digger/releases/download/v0.1.1/';
    await writeFile(
      releaseFile,
      JSON.stringify({
        tag_name: 'v0.1.1',
        draft: false,
        prerelease: false,
        assets: suffixes.map((suffix) => {
          const name = suffix === 'SHA256SUMS' ? suffix : `AutoDigger-0.1.1-${suffix}`;
          return { name, size: 100, browser_download_url: `${base}${name}` };
        }),
      }),
    );
    await promisify(execFile)('yarn', ['site:build', '--outDir', directory], {
      timeout: 30_000,
      env: { ...process.env, AUTO_DIGGER_RELEASE_JSON: releaseFile },
    });
    document.documentElement.innerHTML = await readFile(resolve(directory, 'index.html'), 'utf8');
    expect(document.querySelectorAll('[data-download] a')).toHaveLength(4);
    expect(document.querySelector('[data-download="macos-arm64"] a')?.getAttribute('href')).toBe(
      `${base}AutoDigger-0.1.1-macos-arm64.dmg`,
    );
    expect(document.querySelector('[data-release-status]')?.textContent).toContain('0.1.1');
    expect(document.body.textContent).not.toContain('not published yet');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
