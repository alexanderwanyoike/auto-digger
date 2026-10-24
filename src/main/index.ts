import { app, BrowserWindow, dialog } from 'electron';
import { applicationId } from './youtube/identity';
import { createWindow } from './createWindow';

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
app.setAppUserModelId(applicationId);
app.whenReady().then(openWindow).catch(reportStartupFailure);

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
