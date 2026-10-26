import { _electron as electron, expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';
import { resolve } from 'node:path';
import { selectAppearance } from '../appearance';
import { contrast } from '../contrast';

async function expectFlushFocus(field: Locator) {
  await expect(field).toHaveCSS('outline-style', 'none');
  await expect(field).toHaveCSS('outline-offset', '0px');
  await expect(field).toHaveCSS('box-shadow', / 0px 0px 0px 1px$/);
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
      shadow: style.boxShadow,
      border: parseFloat(style.borderTopWidth),
      color: hex(style.borderTopColor),
      borderColor: style.borderTopColor,
      background: hex(style.backgroundColor),
    };
  });
  expect(frame.shadow.match(/-?[\d.]+px/g), 'One compact focus frame').toEqual([
    '0px',
    '0px',
    '0px',
    '1px',
  ]);
  expect(frame.border).toBe(1);
  expect(frame.shadow).toContain(frame.borderColor);
  expect(
    contrast(frame.color, frame.background),
    'Focus remains distinguishable',
  ).toBeGreaterThanOrEqual(3);
}

async function expectSystemFocus(field: Locator) {
  await expect(field).toHaveCSS('box-shadow', 'none');
  await expect(field).toHaveCSS('outline-style', 'solid');
  await expect(field).toHaveCSS('outline-width', '2px');
  await expect(field).toHaveCSS('outline-offset', '0px');
}

(['Light', 'Dark'] as const).forEach((mode) => {
  test(`uses a single flush field focus frame in ${mode.toLowerCase()} mode`, async () => {
    const desktop = await electron.launch({
      args: [
        resolve('tests/encrypted-desktop.cjs'),
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
      await selectAppearance(page, mode);
      await page.getByRole('button', { name: 'Discogs not connected', exact: true }).click();
      const token = page.getByLabel('Personal token');
      await token.focus();
      await expectFlushFocus(token);
      await token.fill('focus-fixture');
      await page.getByRole('button', { name: 'Connect account', exact: true }).click();
      await page.getByRole('button', { name: 'Connected as quiet-digger', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      await page
        .getByRole('radio', { name: mode === 'Light' ? 'Ceramic' : 'Warm paper', exact: true })
        .check();
      await page
        .getByRole('radio', { name: mode === 'Light' ? 'Blue' : 'Rose', exact: true })
        .check();
      await selectAppearance(page, mode);
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
      await expect(genre).toHaveCSS('box-shadow', 'none');
      const control = page
        .locator('.taxonomy-field')
        .filter({ has: genre })
        .locator('.taxonomy__control');
      await expectFlushFocus(control);
      await page.screenshot({ path: `test-results/field-focus-${mode.toLowerCase()}-select.png` });
      const cratePicker = page.getByRole('combobox', { name: 'Active crate', exact: true });
      await page.keyboard.press('Tab');
      await cratePicker.focus();
      await expectFlushFocus(cratePicker);
      await page.getByRole('button', { name: 'Downloads', exact: true }).click();
      const downloads = page.getByLabel('Search downloads', { exact: true });
      await downloads.focus();
      await expectFlushFocus(downloads);
      await page.getByRole('button', { name: 'Crates', exact: true }).click();
      const crateName = page.getByLabel('New crate name', { exact: true });
      await crateName.focus();
      await expectFlushFocus(crateName);
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      const layout = page.getByRole('textbox', { name: 'Folder layout', exact: true });
      await page.keyboard.press('Tab');
      await layout.focus();
      await expectFlushFocus(layout);
      await page.getByRole('button', { name: 'Enable MCP', exact: true }).click();
      await page.getByText('Codex and other local clients', { exact: true }).click();
      const config = page.getByRole('textbox', { name: 'Argument 1', exact: true });
      await config.focus();
      await expectFlushFocus(config);
      await page.getByRole('button', { name: 'Disable MCP', exact: true }).click();
      await page.emulateMedia({ forcedColors: 'active' });
      await page.keyboard.press('Tab');
      await layout.focus();
      await expectSystemFocus(layout);
      await page.getByRole('button', { name: 'Digging desk', exact: true }).click();
      const forcedGenre = page.getByLabel('Genre', { exact: true });
      await forcedGenre.focus();
      await expect(forcedGenre).toHaveCSS('outline-style', 'none');
      const forcedControl = page
        .locator('.taxonomy-field')
        .filter({ has: forcedGenre })
        .locator('.taxonomy__control');
      await expectSystemFocus(forcedControl);
      await page.screenshot({ path: `test-results/field-focus-${mode.toLowerCase()}-forced.png` });
    } finally {
      await desktop.close();
    }
  });
});
