import { app } from 'electron';
import electronUpdater from 'electron-updater';
import { setInterval, setTimeout } from 'node:timers';
import { createNativeUpdateBackend } from './nativeBackend';
import { createUpdateService } from './service';
import type { UpdateResult } from '../../shared/updates';

export function createApplicationUpdates(prepareInstall: () => Promise<UpdateResult<undefined>>) {
  if (
    !app.isPackaged ||
    process.platform === 'darwin' ||
    (process.platform === 'linux' && !process.env.APPIMAGE)
  )
    return undefined;
  const backend = createNativeUpdateBackend(electronUpdater.autoUpdater, prepareInstall);
  const updates = createUpdateService(backend);
  const check = () => {
    updates
      .check()
      .then((result) => {
        if (!result.ok) process.stderr.write(`${result.error}\n`);
      })
      .catch(() => {
        process.stderr.write('The update check could not finish.\n');
      });
  };
  setTimeout(check, 30_000).unref();
  setInterval(check, 4 * 60 * 60 * 1000).unref();
  return updates;
}
