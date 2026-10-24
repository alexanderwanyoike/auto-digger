import { _electron as electron, expect, test } from '@playwright/test';

[900, 1180].forEach((width) => {
  test(`desktop desk opens safely, remembers appearance and fits ${width.toString()}x780`, async () => {
    const environment = Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
      ),
    );
    const desktop = await electron.launch({
      args: [`--user-data-dir=${test.info().outputPath('profile')}`, '.'],
      env: environment,
    });
    try {
      const page = await desktop.firstWindow();
      await expect(page.getByRole('heading', { name: 'Digging desk' })).toBeVisible();
      expect(await page.evaluate(() => 'require' in window || 'process' in window)).toBe(false);
      await page.getByRole('button', { name: 'Dark', exact: true }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await page.reload();
      await expect(page.getByRole('button', { name: 'Dark', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await page.getByRole('button', { name: 'Light', exact: true }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
      const popup = await page.evaluate(() => window.open('https://example.com'));
      expect(popup).toBeNull();
      expect(desktop.windows()).toHaveLength(1);
      await page.setViewportSize({ width, height: 780 });
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      const layout = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      }));
      expect(layout.width).toBeLessThanOrEqual(layout.viewportWidth);
      expect(layout.height).toBeLessThanOrEqual(layout.viewportHeight);
      await expect(page.getByText('Built for the long way round.')).toBeInViewport({ ratio: 1 });
      await page.screenshot({
        path: `test-results/phase-1-${width.toString()}-light.png`,
        fullPage: true,
      });
      await page.getByRole('button', { name: 'Dark', exact: true }).click();
      await page.screenshot({
        path: `test-results/phase-1-${width.toString()}-dark.png`,
        fullPage: true,
      });
    } finally {
      await desktop.close();
    }
  });
});

test('connects and loads metadata through the isolated Discogs bridge', async () => {
  const { identityResponse, releaseResponse } = await import('../discogsFixtures');
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
    ),
  );
  const desktop = await electron.launch({
    args: [`--user-data-dir=${test.info().outputPath('discogs-profile')}`, '.'],
    env: environment,
  });
  try {
    const page = await desktop.firstWindow();
    await page.getByRole('heading', { name: 'Digging desk' }).waitFor();
    await desktop.evaluate(
      (_electron, fixtures) => {
        globalThis.fetch = (input) => {
          const url = input instanceof Request ? input.url : input.toString();
          if (url.endsWith('/oauth/identity'))
            return Promise.resolve(new Response(JSON.stringify(fixtures.identityResponse)));
          if (url.endsWith('/releases/12'))
            return Promise.resolve(new Response(JSON.stringify(fixtures.releaseResponse)));
          return Promise.resolve(new Response('{}', { status: 404 }));
        };
      },
      { identityResponse, releaseResponse },
    );
    await page.route('https://i.discogs.com/**', async (route) => {
      await route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="#bccddd"/><circle cx="150" cy="150" r="85" fill="#294f78"/></svg>',
      });
    });
    await page.getByRole('button', { name: 'Discogs not connected', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel('Personal token').fill('test-session-token');
    await page.getByRole('button', { name: 'Connect account', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Connected as quiet-digger', exact: true }),
    ).toBeEnabled();
    await expect(page.getByLabel('Personal token')).toHaveCount(0);
    await page.getByLabel('Discogs release ID').fill('12');
    await page.getByRole('button', { name: 'Load release', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Quiet Orbit EP', exact: true })).toBeVisible();
    await expect(page.getByText('Low Tide', { exact: true })).toBeVisible();
    await expect(page.getByText('Quiet Orbit', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => 'require' in window || 'process' in window)).toBe(false);
    await page.setViewportSize({ width: 1180, height: 780 });
    await expect(page.getByText('Built for the long way round.', { exact: true })).toBeInViewport({
      ratio: 1,
    });
    await page.screenshot({ path: 'test-results/phase-2-release-light.png', fullPage: true });
    await page.getByRole('button', { name: 'Dark', exact: true }).click();
    await page.screenshot({ path: 'test-results/phase-2-release-dark.png', fullPage: true });
    await page.getByRole('button', { name: 'Connected as quiet-digger', exact: true }).click();
    await page.getByRole('button', { name: 'Disconnect', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Discogs not connected', exact: true }),
    ).toBeEnabled();
    await expect(page.getByRole('heading', { name: 'Quiet Orbit EP', exact: true })).toHaveCount(0);
    expect(await page.evaluate(async () => window.discogs?.account())).toEqual({
      ok: true,
      value: null,
    });
  } finally {
    await desktop.close();
  }
});
