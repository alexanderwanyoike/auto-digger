import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';

test('keeps navigation and playback compact in the desktop workspace', async () => {
  const desktop = await electron.launch({
    args: [
      resolve('tests/encrypted-desktop.cjs'),
      `--user-data-dir=${test.info().outputPath('profile')}`,
    ],
  });
  try {
    const page = await desktop.firstWindow();
    await page.setViewportSize({ width: 900, height: 780 });
    const banner = page.getByRole('banner');
    const playback = page.getByRole('contentinfo', { name: 'Playback' });
    await expect(banner).toBeVisible();
    expect((await banner.boundingBox())?.height).toBeLessThanOrEqual(50);
    expect((await playback.boundingBox())?.height).toBeLessThanOrEqual(60);
    await expect(page.getByRole('button', { name: 'Search releases', exact: true })).toBeInViewport(
      {
        ratio: 1,
      },
    );

    const navigation = banner.getByRole('navigation', { name: 'Main sections' });
    const desk = navigation.getByRole('button', { name: 'Digging desk', exact: true });
    await expect(desk).toHaveAttribute('aria-current', 'page');
    await desk.focus();
    await page.keyboard.press('Tab');
    const crates = navigation.getByRole('button', { name: 'Crates', exact: true });
    await expect(crates).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(crates).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { name: 'Crates', exact: true })).toBeVisible();
    await expect(playback).toBeInViewport({ ratio: 1 });
  } finally {
    await desktop.close();
  }
});
