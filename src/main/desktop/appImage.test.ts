import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from 'vitest';
import { integrateAppImage } from './appImage';
import { applicationId } from '../applicationId';

test('adds one launcher and icon to XDG user data and refreshes the AppImage location', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-menu-'));
  try {
    const appImage = join(directory, 'Auto Digger.AppImage');
    await writeFile(appImage, 'AppImage fixture', { mode: 0o755 });
    const options = {
      platform: 'linux' as const,
      packaged: true,
      appImage,
      dataHome: join(directory, 'user data'),
      home: directory,
      icon: resolve('resources/icons/icon.png'),
    };
    expect(await integrateAppImage(options)).toEqual({ ok: true, value: undefined });
    const entry = join(options.dataHome, 'applications', `${applicationId}.desktop`);
    expect(await readFile(entry, 'utf8')).toContain(`Exec="${appImage}"`);
    expect(await readFile(entry, 'utf8')).toContain('StartupWMClass=auto-digger');
    expect(await readFile(join(options.dataHome, 'icons', `${applicationId}.png`))).toEqual(
      await readFile(options.icon),
    );
    const updated = join(directory, 'Auto Digger 2.AppImage');
    await writeFile(updated, 'Updated AppImage fixture', { mode: 0o755 });
    expect(await integrateAppImage({ ...options, appImage: updated })).toEqual({
      ok: true,
      value: undefined,
    });
    expect(await readFile(entry, 'utf8')).toContain(`Exec="${updated}"`);
    expect(await readdir(join(options.dataHome, 'applications'))).toEqual([
      `${applicationId}.desktop`,
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
