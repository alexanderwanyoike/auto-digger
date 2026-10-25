import { _electron as electron, expect, test } from '@playwright/test';
import { resolve, delimiter } from 'node:path';
import { selectAppearance } from '../appearance';
import { loadedRelease } from '../discogsFixtures';

test('downloads, persists and streams seekable audio through the isolated desktop library', async () => {
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
    ),
  );
  environment.PATH = `${resolve('tests/fixtures')}${delimiter}${environment.PATH ?? ''}`;
  const options = {
    args: [
      resolve('tests/encryptedDesktop.cjs'),
      `--user-data-dir=${test.info().outputPath('audio-profile')}`,
    ],
    env: environment,
  };
  let desktop = await electron.launch(options);
  try {
    let page = await desktop.firstWindow();
    await page.getByRole('heading', { name: 'Digging desk' }).waitFor();
    expect(
      await page.evaluate(
        async (release) => window.audioLibrary?.download({ release, videoIndex: 0 }),
        loadedRelease,
      ),
    ).toMatchObject({ ok: true, value: { id: '12-abcdefghijk', title: 'Quiet Orbit' } });
    expect(
      await page.evaluate(async () => window.audioLibrary?.probe('https://youtu.be/xxxxxxxxxxx')),
    ).toMatchObject({ ok: false, error: { code: 'unavailable' } });
    expect(
      await page.evaluate(async () => window.audioLibrary?.probe('file:///etc/passwd')),
    ).toMatchObject({ ok: false, error: { code: 'invalid-input' } });
    const response = await desktop.evaluate(async ({ net }) => {
      const result = await net.fetch('auto-digger-audio://track/12-abcdefghijk', {
        headers: { Range: 'bytes=0-9' },
      });
      return {
        status: result.status,
        bytes: (await result.arrayBuffer()).byteLength,
        range: result.headers.get('content-range'),
      };
    });
    expect(response).toMatchObject({ status: 206, bytes: 10 });
    expect(response.range).toMatch(/^bytes 0-9\//);
    expect(
      await desktop.evaluate(
        async ({ net }) => (await net.fetch('auto-digger-audio://track/../../etc/passwd')).status,
      ),
    ).toBe(404);
    await desktop.close();
    desktop = await electron.launch(options);
    page = await desktop.firstWindow();
    await page.getByRole('heading', { name: 'Digging desk' }).waitFor();
    expect(await page.evaluate(async () => window.audioLibrary?.list())).toMatchObject({
      ok: true,
      value: [{ title: 'Quiet Orbit' }],
    });
  } finally {
    await desktop.close();
  }
});

test('plays downloaded sources in the bottom bar with seek, volume and offline track corrections', async () => {
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
    ),
  );
  const options = {
    args: [
      resolve('tests/encryptedDesktop.cjs'),
      `--user-data-dir=${test.info().outputPath('player-profile')}`,
    ],
    env: environment,
  };
  let desktop = await electron.launch(options);
  const release = {
    ...loadedRelease,
    tracks: [...loadedRelease.tracks, { position: 'B1', title: 'Evening Mix', duration: '5:00' }],
    videos: [
      ...loadedRelease.videos,
      { title: 'Unknown upload', url: 'https://youtu.be/lmnopqrstuv' },
      { title: 'Unavailable upload', url: 'https://youtu.be/xxxxxxxxxxx' },
    ],
  };
  try {
    let page = await desktop.firstWindow();
    await page.getByRole('heading', { name: 'Digging desk' }).waitFor();
    await page.evaluate(async (record) => window.crate?.save(record), release);
    await page.reload();
    await page.getByRole('button', { name: 'Open Quiet Orbit EP' }).click();
    const sources = page.getByRole('region', { name: 'Audio sources' });
    const sourceList = sources.getByRole('list', { name: 'YouTube audio sources' });
    const first = sourceList.getByRole('listitem').nth(0);
    const second = sourceList.getByRole('listitem').nth(1);
    await expect(sourceList.getByRole('listitem')).toHaveCount(3);
    await expect(first.getByLabel('Discogs track')).toHaveValue('0');
    await second.getByLabel('Discogs track').selectOption('');
    await expect(first.getByRole('button', { name: 'Download audio' })).toBeEnabled();
    await first.getByRole('button', { name: 'Download audio' }).click();
    const player = page.getByRole('contentinfo', { name: 'Playback' });
    await expect(player.getByRole('button', { name: 'Pause', exact: true })).toBeEnabled();
    await player.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(player.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
    const seek = player.getByRole('slider', { name: 'Track position' });
    await expect(seek).toBeEnabled();
    await seek.press('Home');
    await seek.press('ArrowRight');
    await expect.poll(async () => Number(await seek.inputValue())).toBeGreaterThan(0);
    const volume = player.getByRole('slider', { name: 'Volume' });
    await volume.press('Home');
    await expect(volume).toHaveValue('0');
    await expect(sources.getByRole('alert')).toContainText('private');
    await second.getByRole('button', { name: 'Download audio' }).click();
    await expect(player.getByText('Unknown upload', { exact: true })).toBeVisible();
    await second.getByLabel('Discogs track').selectOption('1');
    await second.getByRole('button', { name: 'Update tags' }).click();
    await expect(player.getByText('Evening Mix', { exact: true })).toBeVisible();
    await expect(page.locator('iframe')).toHaveCount(0);
    await page.setViewportSize({ width: 900, height: 780 });
    await expect(player).toBeInViewport();
    await page.screenshot({ path: 'test-results/download-player-light.png', fullPage: true });
    await selectAppearance(page, 'Dark');
    await page.screenshot({ path: 'test-results/download-player-dark.png', fullPage: true });
    await desktop.close();
    desktop = await electron.launch(options);
    page = await desktop.firstWindow();
    await expect(
      page.getByRole('combobox', { name: 'Downloaded track' }).getByRole('option'),
    ).toHaveCount(3);
    await page.getByRole('combobox', { name: 'Downloaded track' }).selectOption('12-lmnopqrstuv');
    await expect(
      page.getByRole('contentinfo', { name: 'Playback' }).getByText('Evening Mix', { exact: true }),
    ).toBeVisible();
  } finally {
    await desktop.close();
  }
});
