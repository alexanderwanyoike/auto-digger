import { autoUpdater as nativeUpdater } from 'electron';
import type { AppUpdater } from 'electron-updater';
import type { UpdateBackend } from './service';

interface AppImageRestart {
  file: string;
  schedule: (file: string) => void;
}

export function createNativeUpdateBackend(
  updater: AppUpdater,
  restart?: AppImageRestart,
): UpdateBackend {
  Object.assign(updater, {
    autoDownload: false,
    autoInstallOnAppQuit: false,
    autoRunAppAfterInstall: restart === undefined,
  });
  let image = restart?.file;
  updater.on('appimage-filename-updated', (file) => {
    image = file;
  });
  if (restart) {
    // The SDK handoff must succeed before queuing a relaunch after normal quit.
    nativeUpdater.once('before-quit-for-update', () => {
      if (image) restart.schedule(image);
    });
  }
  let reportProgress: ((percent: number) => void) | undefined;
  let installFailed = false;
  updater.on('download-progress', (info) => {
    reportProgress?.(info.percent);
  });
  updater.on('error', () => {
    installFailed = true;
  });
  return {
    manual: false,
    async check() {
      try {
        const result = await updater.checkForUpdates();
        return { ok: true, value: result?.isUpdateAvailable ? result.updateInfo.version : null };
      } catch {
        return {
          ok: false,
          error: 'Could not check for updates. Check your connection and try again.',
        };
      }
    },
    async download(progress) {
      reportProgress = progress;
      try {
        await updater.downloadUpdate();
        return { ok: true, value: undefined };
      } catch {
        return {
          ok: false,
          error: 'The update could not be downloaded. Check your connection and try again.',
        };
      } finally {
        reportProgress = undefined;
      }
    },
    install() {
      installFailed = false;
      try {
        updater.quitAndInstall(false, false);
      } catch {
        installFailed = true;
      }
      return Promise.resolve(
        installFailed
          ? {
              ok: false,
              error:
                'The update could not be installed. Check that the app folder is writable and try again.',
            }
          : { ok: true, value: undefined },
      );
    },
  };
}
