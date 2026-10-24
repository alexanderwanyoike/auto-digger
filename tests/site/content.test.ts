import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';

test('leads with MCP mix research and explains how verified finds reach a crate', async () => {
  document.documentElement.innerHTML = await readFile(resolve('site/index.html'), 'utf8');
  expect(document.querySelector('h1')?.textContent).toContain('Auto Digger');
  expect(document.querySelector('.hero')?.textContent).toContain('MCP');
  expect(document.querySelector('nav a')?.getAttribute('href')).toBe('#research');
  const research = document.getElementById('research');
  expect(research?.textContent).toMatch(/client.*Discogs.*crate/is);
  expect(research?.querySelector('a')?.getAttribute('href')).toContain('mix-research.md');
});

test('offers a complete discovery workflow and honest release links without requiring JavaScript', async () => {
  document.documentElement.innerHTML = await readFile(resolve('site/index.html'), 'utf8');
  expect(document.querySelectorAll('main h1')).toHaveLength(1);
  const navigation = Array.from(document.querySelectorAll('nav a'));
  expect(navigation.length).toBeGreaterThanOrEqual(3);
  navigation.forEach((link) => {
    const target = link.getAttribute('href') ?? '';
    if (target.startsWith('#')) expect(document.getElementById(target.slice(1))).not.toBeNull();
  });
  const links = Array.from(document.querySelectorAll('a[href]')).map((link) =>
    link.getAttribute('href'),
  );
  expect(links).toContain('https://github.com/alexanderwanyoike/auto-digger/releases');
  expect(links).toContain('https://github.com/alexanderwanyoike/auto-digger#quick-start');
  expect(links.some((link) => link?.includes('/releases/latest/download'))).toBe(false);
  expect(document.body.textContent).toMatch(/preview.*download.*crate/is);
  expect(document.querySelector('a.skip-link')?.getAttribute('href')).toBe('#main');
  expect(document.querySelectorAll('script')).toHaveLength(0);
});

test('shows labelled unavailable installers with a single release status', async () => {
  document.documentElement.innerHTML = await readFile(resolve('site/index.html'), 'utf8');
  const section = document.getElementById('get-started');
  const controls = Array.from(
    section?.querySelectorAll<HTMLButtonElement>('[data-download] button') ?? [],
  );
  expect(controls).toHaveLength(4);
  expect(controls.every((control) => control.disabled)).toBe(true);
  expect(controls.map((control) => control.getAttribute('aria-label'))).toEqual([
    'Windows x64 installer',
    'macOS Apple silicon disk image',
    'macOS Intel disk image',
    'Linux x64 AppImage',
  ]);
  controls.forEach((control) => { expect(control.getAttribute('aria-describedby')).toBe('download-release-status'); },
  );
  expect(section?.querySelector('details summary')?.textContent).toContain('Requirements');
  expect(section?.textContent).not.toContain('not published yet');
});
