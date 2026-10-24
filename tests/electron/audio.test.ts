import { _electron as electron, expect, test } from '@playwright/test';
import { resolve, delimiter } from 'node:path';
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
