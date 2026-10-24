import { execFile } from 'node:child_process';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { _electron as electron } from '@playwright/test';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { expect, test } from 'vitest';
import metadata from '../../package.json';
import { applicationId } from '../../src/main/applicationId';

test.skipIf(process.platform !== 'linux')(
  'packaged Linux app opens and serves MCP from installed files',
  async () => {
    await promisify(execFile)('yarn', ['package:make', '--linux', '--x64'], { timeout: 120_000 });
    const extracted = await mkdtemp(join(tmpdir(), 'auto-digger-appimage-'));
    await promisify(execFile)(
      resolve(`release/AutoDigger-${metadata.version}-linux-x64.AppImage`),
      ['--appimage-extract'],
      { cwd: extracted, timeout: 30_000 },
    );
    const image = resolve(`release/AutoDigger-${metadata.version}-linux-x64.AppImage`);
    const resources = join(extracted, 'squashfs-root/resources/app');
    await Promise.all(
      [
        'out/main/index.js',
        'out/main/mcp.js',
        'out/preload/index.cjs',
        'out/renderer/index.html',
        'resources/icons/icon.png',
        'LICENSE',
        'site/public/licenses/manrope.txt',
      ].map((file) => access(join(resources, file))),
    );
    const profile = await mkdtemp(join(tmpdir(), 'auto-digger-packaged-'));
    const client = new Client({ name: 'auto-digger-package-check', version: '1.0.0' });
    const desktop = await electron.launch({
      executablePath: image,
      args: [`--user-data-dir=${profile}`],
      env: {
        APPIMAGE_EXTRACT_AND_RUN: '1',
        XDG_DATA_HOME: join(profile, 'data'),
        ...Object.fromEntries(
          Object.entries(process.env).filter(
            (entry): entry is [string, string] =>
              typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
          ),
        ),
      },
    });
    try {
      const page = await desktop.firstWindow();
      await page.getByRole('heading', { name: 'Digging desk', exact: true }).waitFor();
      const entry = join(profile, 'data/applications', `${applicationId}.desktop`);
      await expect
        .poll(async () => readFile(entry, 'utf8').catch(() => ''))
        .toContain(`"${image}"`);
      await access(join(profile, 'data/icons', `${applicationId}.png`));
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      await page.getByRole('button', { name: 'Enable research access', exact: true }).click();
      const status = await page.evaluate(async () => window.researchAccess?.status());
      if (!status?.ok || !status.value.enabled)
        throw new Error('Packaged research access unavailable');
      expect(status.value.configuration.args[0]).toBe(
        join(await desktop.evaluate(({ app }) => app.getAppPath()), 'out/main/mcp.js'),
      );
      await client.connect(new StdioClientTransport(status.value.configuration));
      expect(
        await client.callTool({ name: 'create_crate', arguments: { name: 'Package check' } }),
      ).toMatchObject({ isError: false });
      await page.getByRole('button', { name: 'Crates', exact: true }).click();
      expect(
        await page.getByRole('combobox', { name: 'Active crate', exact: true }).textContent(),
      ).toContain('Package check');
    } finally {
      await client.close();
      await desktop.close();
      await rm(profile, { recursive: true, force: true });
      await rm(extracted, { recursive: true, force: true });
    }
  },
);
