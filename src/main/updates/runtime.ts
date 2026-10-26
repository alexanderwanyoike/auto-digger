import { app, shell } from 'electron';
import electronUpdater from 'electron-updater';
import { setInterval, setTimeout } from 'node:timers';
import { createNativeUpdateBackend } from './native-backend';
import { scheduleAppImageRestart } from './restart-app-image';
import { createMacUpdateBackend } from './mac-backend';
import { createUpdateService } from './service';

export function createApplicationUpdates() {
  if (!app.isPackaged || (process.platform === 'linux' && !process.env.APPIMAGE)) return undefined;
  const backend =
    process.platform === 'darwin'
      ? createMacUpdateBackend(app.getVersion(), process.arch, fetch, (url) =>
          shell.openExternal(url),
        )
      : createNativeUpdateBackend(
          electronUpdater.autoUpdater,
          process.platform === 'linux' && process.env.APPIMAGE
            ? {
                file: process.env.APPIMAGE,
                schedule: scheduleAppImageRestart,
              }
            : undefined,
        );
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
