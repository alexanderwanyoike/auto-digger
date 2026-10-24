import { app, BrowserWindow, dialog } from 'electron';
import { applicationId } from './applicationId';
import { createWindow } from './createWindow';
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
  app.whenReady().then(openWindow).catch(reportStartupFailure);
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
