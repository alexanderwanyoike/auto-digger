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

test('builds a separate setup guide with working Pages links and local assets', async () => {
  await promisify(execFile)('yarn', ['site:build'], { timeout: 30_000 });
  const home = await readFile(resolve('site/dist/index.html'), 'utf8');
  document.documentElement.innerHTML = home;
  expect(
    document.querySelector('a[href="/auto-digger/setup/#mcp"], a[href="setup/#mcp"]'),
  ).not.toBeNull();
  expect(
    document.querySelector('a[href="/auto-digger/setup/#macos"], a[href="setup/#macos"]'),
  ).not.toBeNull();
  document.documentElement.innerHTML = await readFile(
    resolve('site/dist/setup/index.html'),
    'utf8',
  );
  expect(document.querySelector('h1')?.textContent).toBe('Setup');
  const pageUrl = new URL('https://alexanderwanyoike.github.io/auto-digger/setup/');
  await Promise.all(
    Array.from(document.querySelectorAll('a[href], link[href], img[src]')).map(async (element) => {
      const value = element.getAttribute('href') ?? element.getAttribute('src') ?? '';
      const url = new URL(value, pageUrl);
      if (url.origin !== pageUrl.origin) return;
      expect(url.pathname).toMatch(/^\/auto-digger\//);
      const relative = url.pathname.slice('/auto-digger/'.length);
      await access(
        resolve('site/dist', relative.endsWith('/') ? `${relative}index.html` : relative),
      );
      if (url.pathname === pageUrl.pathname && url.hash)
        expect(document.getElementById(url.hash.slice(1))).not.toBeNull();
    }),
  );
});

test('builds a discoverable Soulseek guide with project-prefixed links and screenshots', async () => {
  await promisify(execFile)('yarn', ['site:build'], { timeout: 30_000 });
  document.documentElement.innerHTML = await readFile(resolve('site/dist/index.html'), 'utf8');
  const feature = document.querySelector('.features a[href="soulseek/"]');
  expect(feature).not.toBeNull();
  document.documentElement.innerHTML = await readFile(
    resolve('site/dist/setup/index.html'),
    'utf8',
  );
  expect(document.querySelector('a[href="../soulseek/"]')).not.toBeNull();
  document.documentElement.innerHTML = await readFile(
    resolve('site/dist/soulseek/index.html'),
    'utf8',
  );
  expect(document.querySelector('h1')?.textContent).toBe('Soulseek setup');
  expect(document.querySelectorAll('main h1')).toHaveLength(1);
  expect(document.querySelectorAll('script')).toHaveLength(0);
  expect(document.querySelectorAll('main img')).toHaveLength(2);
  ['native', 'docker'].forEach((method) => {
    expect(
      document.querySelector(`nav[aria-label="Installation methods"] a[href="#${method}"]`),
    ).not.toBeNull();
    ['macos', 'windows', 'linux'].forEach((platform) => {
      expect(document.querySelector(`details#${method}-${platform} summary`)).not.toBeNull();
    });
  });
  const pageUrl = new URL('https://alexanderwanyoike.github.io/auto-digger/soulseek/');
  await Promise.all(
    Array.from(document.querySelectorAll('a[href], link[href], img[src]')).map(async (element) => {
      const value = element.getAttribute('href') ?? element.getAttribute('src') ?? '';
      const url = new URL(value, pageUrl);
      if (url.origin !== pageUrl.origin) return;
      expect(url.pathname).toMatch(/^\/auto-digger\//);
      const relative = url.pathname.slice('/auto-digger/'.length);
      await access(
        resolve('site/dist', relative.endsWith('/') ? `${relative}index.html` : relative),
      );
      if (url.pathname === pageUrl.pathname && url.hash)
        expect(document.getElementById(url.hash.slice(1))).not.toBeNull();
    }),
  );
});

test('publishes the recommendations guide with reachable navigation and bundled assets', async () => {
  await promisify(execFile)('yarn', ['site:build'], { timeout: 30_000 });
  document.documentElement.innerHTML = await readFile(resolve('site/dist/index.html'), 'utf8');
  const guide = document.querySelector('.features a[href="cosine/"]');
  expect(guide).not.toBeNull();
  document.documentElement.innerHTML = await readFile(
    resolve('site/dist/setup/index.html'),
    'utf8',
  );
  expect(document.querySelector('a[href="../cosine/"]')).not.toBeNull();
  document.documentElement.innerHTML = await readFile(
    resolve('site/dist/cosine/index.html'),
    'utf8',
  );
  const pageUrl = new URL('https://alexanderwanyoike.github.io/auto-digger/cosine/');
  await Promise.all(
    Array.from(document.querySelectorAll('a[href], link[href], img[src]')).map(async (element) => {
      const url = new URL(
        element.getAttribute('href') ?? element.getAttribute('src') ?? '',
        pageUrl,
      );
      if (url.origin !== pageUrl.origin) return;
      expect(url.pathname).toMatch(/^\/auto-digger\//);
      const relative = url.pathname.slice('/auto-digger/'.length);
      await access(
        resolve('site/dist', relative.endsWith('/') ? `${relative}index.html` : relative),
      );
      if (url.pathname === pageUrl.pathname && url.hash)
        expect(document.getElementById(url.hash.slice(1))).not.toBeNull();
    }),
  );
});
