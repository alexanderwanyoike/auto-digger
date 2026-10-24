import { _electron as electron, expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';
import { resolve } from 'node:path';
import { contrast } from '../contrast';

async function expectFlushFocus(field: Locator) {
  await expect(field).toHaveCSS('outline-style', 'solid');
  await expect(field).toHaveCSS('outline-offset', '0px');
  const frame = await field.evaluate((element) => {
    const style = getComputedStyle(element);
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Missing colour context');
    const hex = (color: string) => {
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return `#${Array.from(context.getImageData(0, 0, 1, 1).data)
        .slice(0, 3)
        .map((channel) => channel.toString(16).padStart(2, '0'))
        .join('')}`;
    };
    return {
      outline: parseFloat(style.outlineWidth),
      border: parseFloat(style.borderTopWidth),
      color: hex(style.outlineColor),
      borderColor: hex(style.borderTopColor),
      background: hex(style.backgroundColor),
    };
  });
  expect(frame.outline + frame.border, 'One compact focus frame').toBeLessThanOrEqual(2);
  expect(frame.outline + frame.border).toBeGreaterThanOrEqual(2);
  expect(frame.color).toBe(frame.borderColor);
  expect(
    contrast(frame.color, frame.background),
    'Focus remains distinguishable',
  ).toBeGreaterThanOrEqual(3);
}

(['Light', 'Dark'] as const).forEach((mode) => {
  test(`uses a single flush field focus frame in ${mode.toLowerCase()} mode`, async () => {
    const desktop = await electron.launch({
      args: [
        resolve('tests/encryptedDesktop.cjs'),
        `--user-data-dir=${test.info().outputPath('profile')}`,
      ],
      env: {
        ...Object.fromEntries(
          Object.entries(process.env).filter(
            (entry): entry is [string, string] =>
              typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
          ),
        ),
        AUTO_DIGGER_TEST_IDENTITY: '1',
      },
    });
    try {
      const page = await desktop.firstWindow();
      await page.setViewportSize({ width: 1180, height: 1000 });
      await page.getByRole('button', { name: 'Discogs not connected', exact: true }).click();
      await page.getByLabel('Personal token').fill('focus-fixture');
      await page.getByRole('button', { name: 'Connect account', exact: true }).click();
      await page.getByRole('button', { name: 'Connected as quiet-digger', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      await page
        .getByRole('radio', { name: mode === 'Light' ? 'Ceramic' : 'Warm paper', exact: true })
        .check();
      await page
        .getByRole('radio', { name: mode === 'Light' ? 'Blue' : 'Rose', exact: true })
        .check();
      await page.getByRole('button', { name: mode, exact: true }).click();
      await page.getByRole('button', { name: 'Digging desk', exact: true }).click();
      const label = page.getByLabel('Label', { exact: true });
      await label.focus();
      await expectFlushFocus(label);
      await page.keyboard.press('Tab');
      const artist = page.getByLabel('Artist', { exact: true });
      await expect(artist).toBeFocused();
      await expectFlushFocus(artist);
      await page.screenshot({ path: `test-results/field-focus-${mode.toLowerCase()}-text.png` });
      const genre = page.getByLabel('Genre', { exact: true });
      await genre.focus();
      await expect(genre).toHaveCSS('outline-style', 'none');
      const control = page
        .locator('.taxonomy-field')
        .filter({ has: genre })
        .locator('.taxonomy__control');
      await expectFlushFocus(control);
      await page.screenshot({ path: `test-results/field-focus-${mode.toLowerCase()}-select.png` });
    } finally {
      await desktop.close();
    }
  });
});
