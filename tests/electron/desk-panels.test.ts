import { selectAppearance } from '../appearance';
import { _electron as electron, expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { loadedRelease } from '../discogsFixtures';

async function expectPanelOutline(panel: Locator, name: string) {
  const expected = await panel.evaluate((element) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Missing canvas colour context');
    context.fillStyle = getComputedStyle(element).getPropertyValue('--line').trim();
    context.fillRect(0, 0, 1, 1);
    return Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3);
  });
  const { data, info } = await sharp(await panel.screenshot({ scale: 'css' }))
    .raw()
    .toBuffer({ resolveWithObject: true });
  const middleX = Math.floor(info.width / 2);
  const middleY = Math.floor(info.height / 2);
  const edges = [
    { edge: 'top', x: middleX, y: 0 },
    { edge: 'bottom', x: middleX, y: info.height - 1 },
    { edge: 'left', x: 0, y: middleY },
    { edge: 'right', x: info.width - 1, y: middleY },
    { edge: 'top left', x: 0, y: 0 },
    { edge: 'top right', x: info.width - 1, y: 0 },
    { edge: 'bottom left', x: 0, y: info.height - 1 },
    { edge: 'bottom right', x: info.width - 1, y: info.height - 1 },
  ];
  edges.forEach(({ edge, x, y }) => {
    const offset = (y * info.width + x) * info.channels;
    expect(Array.from(data.subarray(offset, offset + 3)), `${name}: ${edge} border`).toEqual(
      expected,
    );
  });
}

async function expectPanelEnds(panel: Locator, heading: string, footer: string) {
  const frame = await panel.boundingBox();
  const title = await panel.getByRole('heading', { name: heading, exact: true }).boundingBox();
  const end = await panel.getByText(footer, { exact: true }).boundingBox();
  const padding = await panel.evaluate((element) => {
    const style = getComputedStyle(element);
    return { top: parseFloat(style.paddingTop), bottom: parseFloat(style.paddingBottom) };
  });
  if (!frame || !title || !end) throw new Error('Missing desk panel content');
  expect(title.y, `${heading} top inset`).toBeGreaterThanOrEqual(frame.y + padding.top - 1);
  expect(end.y + end.height, `${heading} bottom inset`).toBeLessThanOrEqual(
    frame.y + frame.height - padding.bottom + 1,
  );
  await expect(panel.getByRole('heading', { name: heading, exact: true })).toBeInViewport({
    ratio: 1,
  });
  await expect(panel.getByText(footer, { exact: true })).toBeInViewport({ ratio: 1 });
  await expectPanelOutline(panel, heading);
}

[
  [900, 780],
  [1600, 1000],
].forEach(([width = 900, height = 780]) => {
  test(`keeps desk panel ends visible while filters and crates scroll at ${width.toString()}x${height.toString()}`, async () => {
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
      await page.setViewportSize({ width, height });
      await page.getByRole('button', { name: 'Discogs not connected', exact: true }).click();
      await page.getByLabel('Personal token').fill('panel-layout-fixture');
      await page.getByRole('button', { name: 'Connect account', exact: true }).click();
      await page.getByRole('button', { name: 'Connected as quiet-digger', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      await page.getByRole('radio', { name: 'Warm paper', exact: true }).check();
      await page.getByRole('radio', { name: 'Rose', exact: true }).check();
      await selectAppearance(page, 'Dark');
      await page.getByRole('button', { name: 'Digging desk', exact: true }).click();
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      const filters = page.getByRole('complementary', { name: 'The starting point' });
      const filterViewport = filters.locator('.desk-panel-scroll');
      if (height > 900) {
        const content = await filterViewport.evaluate((element) => ({
          height: element.clientHeight,
          contentHeight: element.scrollHeight,
        }));
        expect(content.contentHeight, 'Filter form fits without scrolling').toBeLessThanOrEqual(
          content.height,
        );
        await expect(filters.locator('.phase-note')).toBeInViewport({ ratio: 1 });
      }
      await expect(filterViewport).toHaveCSS('scrollbar-width', 'none');
      await page.getByLabel('Year', { exact: true }).fill('2002');
      await page.getByLabel('Genre', { exact: true }).fill('Electronic');
      await page.getByRole('option', { name: 'Electronic', exact: true }).click();
      await page.getByLabel('Style', { exact: true }).fill('Acid House');
      await page.getByRole('option', { name: 'Acid House', exact: true }).click();
      await page.getByLabel('Style', { exact: true }).press('Escape');
      const crate = page.getByRole('complementary', { name: 'Your crate' });
      const filterFooter = 'Account remembered on this device.';
      const crateFooter = 'Records, saved on this device.';
      await expectPanelEnds(filters, 'The starting point', filterFooter);
      await expectPanelEnds(crate, 'Your crate', crateFooter);
      await filters.getByRole('button', { name: 'Search releases', exact: true }).focus();
      await expect(
        filters.getByRole('button', { name: 'Search releases', exact: true }),
      ).toBeInViewport({ ratio: 1 });
      await expectPanelEnds(filters, 'The starting point', filterFooter);
      await filterViewport.hover();
      await page.mouse.wheel(0, -1000);
      await expect(filters.getByLabel('Label', { exact: true })).toBeInViewport({ ratio: 1 });
      await filters.getByText(filterFooter, { exact: true }).scrollIntoViewIfNeeded();
      await expectPanelEnds(filters, 'The starting point', filterFooter);
      await page.screenshot({ path: `test-results/panel-ends-${width.toString()}-empty.png` });
      await page.evaluate(async (release) => {
        const { catalogue } = window;
        if (!catalogue) throw new Error('Missing desktop catalogue');
        return Promise.all(
          Array.from({ length: 20 }, (_value, index) =>
            catalogue.add({
              crateId: 'default',
              release: {
                ...release,
                id: 1000 + index,
                title: `Archive record ${(index + 1).toString()}`,
              },
            }),
          ),
        );
      }, loadedRelease);
      await page.reload();
      await page.getByRole('button', { name: 'Connected as quiet-digger', exact: true }).waitFor();
      await expect(crate.getByLabel('20 saved releases', { exact: true })).toBeVisible();
      await crate
        .getByRole('button', { name: 'Open Archive record 20', exact: true })
        .scrollIntoViewIfNeeded();
      await expectPanelEnds(crate, 'Your crate', crateFooter);
      await crate
        .getByRole('button', { name: 'Open Archive record 1', exact: true })
        .scrollIntoViewIfNeeded();
      await expectPanelEnds(crate, 'Your crate', crateFooter);
      await expectPanelEnds(filters, 'The starting point', filterFooter);
      await page.screenshot({ path: `test-results/panel-ends-${width.toString()}-populated.png` });
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollHeight <= window.innerHeight &&
            document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    } finally {
      await desktop.close();
    }
  });
});
