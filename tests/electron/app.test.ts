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
    const account = await page.evaluate(async () => window.discogs?.connect('test-session-token'));
    expect(account).toEqual({ ok: true, value: identityResponse });
    const release = await page.evaluate(async () => window.discogs?.loadRelease(12));
    expect(release?.ok).toBe(true);
    if (release?.ok) expect(release.value.title).toBe('Quiet Orbit EP');
    expect(JSON.stringify(release)).not.toContain('test-session-token');
    expect(await page.evaluate(() => 'require' in window || 'process' in window)).toBe(false);
    expect(await page.evaluate(async () => window.discogs?.disconnect())).toEqual({
      ok: true,
      value: undefined,
    });
    expect(await page.evaluate(async () => window.discogs?.account())).toEqual({
      ok: true,
      value: null,
    });
  } finally {
    await desktop.close();
  }
});
