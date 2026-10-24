import { randomBytes } from 'node:crypto';
import { copyFile, mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import type { Result } from '../../shared/result';
import { applicationId } from '../applicationId';

interface AppImageDesktopOptions {
  platform: NodeJS.Platform;
  packaged: boolean;
  appImage?: string | undefined;
  dataHome?: string | undefined;
  home: string;
  icon: string;
}

function quoteExecutable(path: string): string {
  const escaped = path
    .replaceAll('%', '%%')
    .replaceAll('\\', '\\\\\\\\')
    .replace(/["`$]/g, (character) => `\\\\${character}`);
  return `"${escaped}"`;
}

export async function integrateAppImage(
  options: AppImageDesktopOptions,
): Promise<Result<undefined, string>> {
  const { appImage } = options;
  if (options.platform !== 'linux' || !options.packaged || !appImage)
    return { ok: true, value: undefined };
  const dataHome =
    options.dataHome && isAbsolute(options.dataHome)
      ? options.dataHome
      : join(options.home, '.local/share');
  if (!isAbsolute(appImage) || /[\0\r\n=]/.test(appImage) || /[\0\r\n]/.test(dataHome))
    return {
      ok: false,
      error:
        'The AppImage location could not be added to the application menu. Use an absolute path without line breaks or an equals sign.',
    };
  const applications = join(dataHome, 'applications');
  const icons = join(dataHome, 'icons');
  const icon = join(icons, `${applicationId}.png`);
  const entry = join(applications, `${applicationId}.desktop`);
  const temporary = `${entry}.${randomBytes(8).toString('hex')}.tmp`;
  try {
    if (!(await stat(appImage)).isFile())
      return { ok: false, error: 'The AppImage file could not be found for the application menu.' };
    await Promise.all([
      mkdir(applications, { recursive: true, mode: 0o700 }),
      mkdir(icons, { recursive: true, mode: 0o700 }),
    ]);
    await copyFile(options.icon, icon);
    const text = [
      '[Desktop Entry]',
      'Type=Application',
      'Name=Auto Digger',
      'Comment=Find records with Discogs',
      // GLib checks the first executable before expanding literal percent escapes.
      `Exec=env -- ${quoteExecutable(appImage)}`,
      `Icon=${icon.replaceAll('\\', '\\\\')}`,
      'Terminal=false',
      'Categories=AudioVideo;Music;',
      'StartupWMClass=auto-digger',
      'X-AppImage-Name=Auto Digger',
      '',
    ].join('\n');
    await writeFile(temporary, text, { flag: 'wx', mode: 0o644 });
    await rename(temporary, entry);
    return { ok: true, value: undefined };
  } catch {
    await rm(temporary, { force: true }).catch(() => undefined);
    return {
      ok: false,
      error:
        'Auto Digger could not add its application-menu shortcut. Check permissions on your user data folder. The app can still be opened from its AppImage.',
    };
  }
}
