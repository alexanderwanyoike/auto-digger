import { _electron as electron, expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';

test.skip(process.platform !== 'linux', 'AppImage update fixture');

[
  { initialCorruption: false, installFailure: false },
  { initialCorruption: true, installFailure: false },
  { initialCorruption: false, installFailure: true },
].forEach(({ initialCorruption, installFailure }) => {
  test(`downloads and replaces the AppImage while preserving crates${initialCorruption ? ' after rejecting a corrupt download' : ''}${installFailure ? ' after a rejected installation' : ''}`, async () => {
    let corruptNext = initialCorruption;
    const profile = test.info().outputPath('profile');
    await mkdir(profile, { recursive: true });
    const image = join(profile, 'AutoDigger.AppImage');
    const marker = join(profile, 'updated');
    await writeFile(image, 'old AppImage fixture', { mode: 0o755 });
    const escapedMarker = marker.replaceAll("'", "'\\''");
    const payload = Buffer.from(
      `#!/bin/sh\nprintf '%s' installed > '${escapedMarker}'\n#${'x'.repeat(1_000_000)}\n`,
    );
    const sha512 = createHash('sha512').update(payload).digest('base64');
    const server = createServer((request, response) => {
      if (request.url?.startsWith('/latest-linux.yml')) {
        response.end(
          JSON.stringify({
            version: '0.1.2',
            files: [{ url: 'AutoDigger-0.1.2-linux-x64.AppImage', sha512, size: payload.length }],
            path: 'AutoDigger-0.1.2-linux-x64.AppImage',
            sha512,
            releaseDate: '2026-10-25T00:00:00Z',
          }),
        );
        return;
      }
      const bytes = Buffer.from(payload);
      if (corruptNext) bytes[bytes.length - 1] = 0;
      corruptNext = false;
      response.writeHead(200, { 'Content-Length': bytes.length });
      let offset = 0;
      const interval = setInterval(() => {
        response.write(bytes.subarray(offset, offset + 32_768));
        offset += 32_768;
        if (offset >= payload.length) {
          clearInterval(interval);
          response.end();
        }
      }, 100);
      response.on('close', () => {
        clearInterval(interval);
      });
    });
    await new Promise<void>((done) => {
      server.listen(0, '127.0.0.1', done);
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No update server');
    const environment = Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
      ),
    );
    const desktop = await electron.launch({
      args: [resolve('tests/updatingDesktop.cjs'), `--user-data-dir=${profile}`],
      env: {
        ...environment,
        APPIMAGE: image,
        AUTO_DIGGER_TEST_INSTALL_ERROR: installFailure ? '1' : '0',
        XDG_CACHE_HOME: join(profile, 'cache'),
        XDG_DATA_HOME: join(profile, 'data'),
        AUTO_DIGGER_TEST_UPDATE_URL: `http://127.0.0.1:${address.port.toString()}/`,
      },
    });
    try {
      const page = await desktop.firstWindow();
      expect(
        await page.evaluate(async () => window.catalogue?.create('Keep my records')),
      ).toMatchObject({ ok: true });
      await expect(
        page.getByRole('button', { name: 'Check for updates', exact: true }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Check for updates', exact: true }).click();
      await page.getByRole('button', { name: 'Update available · v0.1.2', exact: true }).click();
      await expect(page.getByText(/Downloading update · \d+%/)).toBeVisible();
      if (initialCorruption) {
        await expect(
          page.getByRole('button', { name: 'Update failed · Retry', exact: true }),
        ).toBeEnabled();
        expect(await readFile(image, 'utf8')).toBe('old AppImage fixture');
        expect(await page.evaluate(async () => window.updates?.install())).toMatchObject({
          ok: false,
        });
        await page.getByRole('button', { name: 'Update failed · Retry', exact: true }).click();
      }
      if (installFailure) {
        expect(await page.evaluate(async () => window.researchAccess?.start())).toMatchObject({
          ok: true,
        });
        await page.getByRole('button', { name: 'Restart to update · v0.1.2', exact: true }).click();
        await expect(
          page.getByRole('button', { name: 'Update failed · Retry', exact: true }),
        ).toBeEnabled();
        expect(
          await page.evaluate(async () => window.catalogue?.create('Still usable')),
        ).toMatchObject({ ok: true });
        expect(await page.evaluate(async () => window.researchAccess?.status())).toMatchObject({
          ok: true,
          value: { enabled: true },
        });
        expect(await desktop.evaluate(({ app }) => app.hasSingleInstanceLock())).toBe(true);
        expect(await readFile(image, 'utf8')).toBe('old AppImage fixture');
        await page.getByRole('button', { name: 'Update failed · Retry', exact: true }).click();
      } else {
        await page.getByRole('button', { name: 'Restart to update · v0.1.2', exact: true }).click();
      }
      await expect.poll(() => readFile(marker, 'utf8').catch(() => '')).toBe('installed');
      expect(await readFile(image)).toEqual(payload);
    } finally {
      await desktop.close().catch(() => undefined);
      await new Promise<void>((done) => {
        server.close(() => {
          done();
        });
        server.closeAllConnections();
      });
    }
    const reopened = await electron.launch({
      args: [resolve('tests/encryptedDesktop.cjs'), `--user-data-dir=${profile}`],
      env: environment,
    });
    try {
      const page = await reopened.firstWindow();
      await page.getByRole('button', { name: 'Crates', exact: true }).click();
      await expect(page.getByRole('combobox', { name: 'Active crate' })).toContainText(
        'Keep my records',
      );
    } finally {
      await reopened.close();
    }
  });
});
