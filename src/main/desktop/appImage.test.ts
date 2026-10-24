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

test.each([undefined, '', 'relative/data'])(
  'uses the XDG default when data home is %s',
  async (dataHome) => {
    const directory = await mkdtemp(join(tmpdir(), 'auto-digger-menu-default-'));
    try {
      const appImage = join(directory, 'Auto Digger.AppImage');
      await writeFile(appImage, 'AppImage fixture');
      expect(
        await integrateAppImage({
          platform: 'linux',
          packaged: true,
          appImage,
          dataHome,
          home: directory,
          icon: resolve('resources/icons/icon.png'),
        }),
      ).toMatchObject({ ok: true });
      expect(
        await readFile(
          join(directory, '.local/share/applications', `${applicationId}.desktop`),
          'utf8',
        ),
      ).toContain('Name=Auto Digger');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);

test('leaves development, unpackaged Linux and other platforms untouched', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-menu-skip-'));
  try {
    const options = {
      home: directory,
      dataHome: join(directory, 'data'),
      icon: '/unused',
      appImage: '/unused.AppImage',
    };
    await Promise.all([
      integrateAppImage({ ...options, platform: 'linux', packaged: false }),
      integrateAppImage({ ...options, platform: 'darwin', packaged: true }),
      integrateAppImage({ ...options, platform: 'win32', packaged: true }),
      integrateAppImage({ ...options, platform: 'linux', packaged: true, appImage: undefined }),
    ]);
    expect(await readdir(directory)).toEqual([]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('reports unavailable user data without overwriting the existing file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-menu-error-'));
  try {
    const appImage = join(directory, 'Auto Digger.AppImage');
    const dataHome = join(directory, 'data');
    await writeFile(appImage, 'AppImage fixture');
    await writeFile(dataHome, 'keep this file');
    expect(
      await integrateAppImage({
        platform: 'linux',
        packaged: true,
        appImage,
        dataHome,
        home: directory,
        icon: resolve('resources/icons/icon.png'),
      }),
    ).toMatchObject({ ok: false });
    expect(await readFile(dataHome, 'utf8')).toBe('keep this file');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('quotes spaces and desktop-entry metacharacters without interpreting them', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-menu-quotes-'));
  try {
    const appImage = join(directory, 'Digger\'s "mix" $cash 100%.AppImage');
    await writeFile(appImage, 'AppImage fixture');
    const dataHome = join(directory, 'data');
    expect(
      await integrateAppImage({
        platform: 'linux',
        packaged: true,
        appImage,
        dataHome,
        home: directory,
        icon: resolve('resources/icons/icon.png'),
      }),
    ).toMatchObject({ ok: true });
    const text = await readFile(join(dataHome, 'applications', `${applicationId}.desktop`), 'utf8');
    expect(text).toContain(`Exec="${directory}/Digger's \\\\"mix\\\\" \\\\$cash 100%%.AppImage"`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
