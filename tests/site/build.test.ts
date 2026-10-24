import { execFile } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { expect, test } from 'vitest';

test('builds a self-contained Pages artifact with working project-prefixed assets', async () => {
  await promisify(execFile)('yarn', ['site:build'], { timeout: 30_000 });
  document.documentElement.innerHTML = await readFile(resolve('site/dist/index.html'), 'utf8');
  const assets = Array.from(
    document.querySelectorAll('img[src], link[rel="stylesheet"], link[rel="icon"]'),
  ).map((element) => element.getAttribute('src') ?? element.getAttribute('href') ?? '');
  expect(assets.length).toBeGreaterThanOrEqual(5);
  await Promise.all(
    assets.map(async (asset) => {
      const url = new URL(asset, 'https://alexanderwanyoike.github.io/auto-digger/');
      expect(url.origin).toBe('https://alexanderwanyoike.github.io');
      expect(url.pathname).toMatch(/^\/auto-digger\//);
      await access(resolve('site/dist', url.pathname.slice('/auto-digger/'.length)));
    }),
  );
  const stylesheet = assets.find((asset) => asset.endsWith('.css'));
  expect(stylesheet).toBeDefined();
  const css = await readFile(
    resolve('site/dist', stylesheet?.replace('/auto-digger/', '') ?? ''),
    'utf8',
  );
  expect(css).not.toContain('https://fonts.googleapis.com');
  expect(css).toContain('.woff2');
});
