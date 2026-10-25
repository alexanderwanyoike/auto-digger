import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, open, readFile, readlink, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createServer as createSocket } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { chromium } from '@playwright/test';
import type { Browser } from '@playwright/test';
import { expect, test } from 'vitest';
import configuration from '../../electron-builder.json';
import metadata from '../../package.json';
import { applicationId } from '../../src/main/applicationId';

test.skipIf(process.platform !== 'linux')(
  'restarts a real updated AppImage with its profile and application menu intact',
  async () => {
    const root = await mkdtemp(join(tmpdir(), 'auto-digger-update-'));
    const profile = join(root, 'profile');
    const log = await open(join(root, 'launch.log'), 'a');
    await promisify(execFile)('yarn', ['package:make', '--linux', '--x64'], { timeout: 120_000 });
    const name = `AutoDigger-${metadata.version}-linux-x64.AppImage`;
    const payload = await readFile(resolve('release', name));
    const sha512 = createHash('sha512').update(payload).digest('base64');
    const server = createServer((request, response) => {
      if (request.url?.startsWith('/latest-linux.yml')) {
        response.end(
          JSON.stringify({
            version: metadata.version,
            files: [{ url: name, sha512, size: payload.length }],
            path: name,
            sha512,
          }),
        );
      } else {
        response.writeHead(200, { 'Content-Length': payload.length });
        response.end(payload);
      }
    });
    await new Promise<void>((done) => {
      server.listen(0, '127.0.0.1', done);
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No update feed');
    const config = join(root, 'builder.json');
    await writeFile(
      config,
      JSON.stringify({
        ...configuration,
        directories: { ...configuration.directories, output: join(root, 'images') },
        extraMetadata: { version: '0.0.1' },
        publish: { provider: 'generic', url: `http://127.0.0.1:${address.port.toString()}/` },
      }),
    );
    await promisify(execFile)(
      'yarn',
      ['electron-builder', '--config', config, '--linux', '--x64', '--publish', 'never'],
      { timeout: 120_000 },
    );
    const socket = createSocket();
    await new Promise<void>((done) => {
      socket.listen(0, '127.0.0.1', done);
    });
    const endpoint = socket.address();
    if (!endpoint || typeof endpoint === 'string') throw new Error('No debugging port');
    await new Promise<void>((done) => {
      socket.close(() => {
        done();
      });
    });
    const debug = `http://127.0.0.1:${endpoint.port.toString()}`;
    const original = join(root, 'images/AutoDigger-0.0.1-linux-x64.AppImage');
    const desktop = spawn(
      original,
      [`--user-data-dir=${profile}`, `--remote-debugging-port=${endpoint.port.toString()}`],
      {
        env: {
          ...Object.fromEntries(
            Object.entries(process.env).filter(([key]) => key !== 'ELECTRON_RUN_AS_NODE'),
          ),
          ...(process.env.AUTO_DIGGER_TEST_FUSE === '1' ? {} : { APPIMAGE_EXTRACT_AND_RUN: '1' }),
          XDG_DATA_HOME: join(root, 'data'),
          XDG_CONFIG_HOME: join(root, 'config'),
          XDG_CACHE_HOME: join(root, 'cache'),
        },
        stdio: ['ignore', log.fd, log.fd],
      },
    );
    let browser: Browser | undefined;
    try {
      await expect
        .poll(
          () =>
            fetch(`${debug}/json/version`)
              .then((r) => r.status)
              .catch(() => 0),
          { timeout: 10_000 },
        )
        .toBe(200);
      browser = await chromium.connectOverCDP(debug);
      const page = browser.contexts()[0]?.pages()[0];
      if (!page) throw new Error('No original window');
      await page.getByRole('heading', { name: 'Digging desk', exact: true }).waitFor();
      expect(
        await page.evaluate(async () => window.catalogue?.create('Update survivor')),
      ).toMatchObject({ ok: true });
      await page.getByRole('button', { name: 'Check for updates', exact: true }).click();
      await page
        .getByRole('button', { name: `Update available · v${metadata.version}`, exact: true })
        .click();
      await page
        .getByRole('button', { name: `Restart to update · v${metadata.version}`, exact: true })
        .click();
      const entry = join(root, 'data/applications', `${applicationId}.desktop`);
      await expect
        .poll(async () => readFile(entry, 'utf8').catch(() => ''), { timeout: 20_000 })
        .toContain(`"${join(root, 'images', name)}"`);
      expect(
        createHash('sha512')
          .update(await readFile(join(root, 'images', name)))
          .digest('base64'),
      ).toBe(sha512);
      await expect(readFile(original)).rejects.toMatchObject({ code: 'ENOENT' });
      await expect
        .poll(
          () =>
            fetch(`${debug}/json/version`)
              .then((r) => r.status)
              .catch(() => 0),
          { timeout: 10_000 },
        )
        .toBe(200);
      browser = await chromium.connectOverCDP(debug);
      const updated = browser.contexts()[0]?.pages()[0];
      if (!updated) throw new Error('No updated window');
      await updated.getByRole('button', { name: 'Settings', exact: true }).click();
      const about = updated.getByRole('region', { name: 'About', exact: true });
      await about.scrollIntoViewIfNeeded();
      expect(
        await about.getByText(`Version ${metadata.version}`, { exact: true }).isVisible(),
      ).toBe(true);
      await updated.getByRole('button', { name: 'Crates', exact: true }).click();
      expect(await updated.getByRole('combobox', { name: 'Active crate' }).textContent()).toContain(
        'Update survivor',
      );
      await updated.close();
    } finally {
      await browser?.close().catch(() => undefined);
      desktop.kill();
      await Promise.all(
        [profile, join(root, 'config/Auto Digger')].map(async (directory) => {
          const lock = await readlink(join(directory, 'SingletonLock')).catch(() => '');
          const pid = Number(lock.split('-').at(-1));
          if (Number.isInteger(pid) && pid > 0)
            await promisify(execFile)('kill', ['-TERM', pid.toString()]).catch(() => undefined);
        }),
      );
      await new Promise<void>((done) => {
        server.close(() => {
          done();
        });
        server.closeAllConnections();
      });
      await log.close();
      await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  },
);
