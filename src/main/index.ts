import { app, BrowserWindow, dialog } from 'electron';
import { join } from 'node:path';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { integrateAppImage } from './desktop/app-image';
import { applicationId } from './application-id';
import { createWindow } from './create-window';
import { registerAudioScheme } from './audio/protocol';

function reportStartupFailure(error: unknown) {
  dialog.showErrorBox(
    'Auto Digger could not start',
    error instanceof Error ? error.message : 'Electron could not initialise.',
  );
  app.exit(1);
}

async function openWindow() {
  const result = await createWindow();
  if (!result.ok) {
    dialog.showErrorBox('Auto Digger could not start', result.error);
    app.exit(1);
  }
}

app.setName('Auto Digger');
if (
  process.env.AUTO_DIGGER_API_PROTOTYPE === '1' &&
  process.env.AUTO_DIGGER_API_PROTOTYPE_USE_PROFILE !== '1'
) {
  app.setName('Auto Digger API Prototype');
  const profile = mkdtempSync(join(app.getPath('temp'), 'auto-digger-api-prototype-'));
  const music = join(profile, 'Music');
  mkdirSync(music);
  app.setPath('userData', profile);
  app.setPath('music', music);
}
registerAudioScheme();
app.setAppUserModelId(applicationId);
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const window = BrowserWindow.getAllWindows()[0];
    if (window?.isMinimized()) window.restore();
    window?.show();
    window?.focus();
  });
  app
    .whenReady()
    .then(async () => {
      await openWindow();
      const integrated = await integrateAppImage({
        platform: process.platform,
        packaged: app.isPackaged,
        appImage: process.env.APPIMAGE,
        dataHome: process.env.XDG_DATA_HOME,
        home: app.getPath('home'),
        icon: join(import.meta.dirname, '../../resources/icons/icon.png'),
      });
      if (!integrated.ok) process.stderr.write(`${integrated.error}\n`);
    })
    .catch(reportStartupFailure);
}

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    openWindow().catch(reportStartupFailure);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
