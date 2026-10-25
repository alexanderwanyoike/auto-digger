import type { AppUpdater } from 'electron-updater';
import type { UpdateBackend } from './service';
import type { UpdateResult } from '../../shared/updates';

export function createNativeUpdateBackend(
  updater: AppUpdater,
  prepareInstall: () => Promise<UpdateResult<undefined>>,
): UpdateBackend {
  Object.assign(updater, { autoDownload: false, autoInstallOnAppQuit: false });
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
    async install() {
      const prepared = await prepareInstall();
      if (!prepared.ok) return prepared;
      installFailed = false;
      try {
        updater.quitAndInstall(false, true);
      } catch {
        installFailed = true;
      }
      return installFailed
        ? {
            ok: false,
            error:
              'The update could not be installed. Check that the app folder is writable and try again.',
          }
        : { ok: true, value: undefined };
    },
  };
}
