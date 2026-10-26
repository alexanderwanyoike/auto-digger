const { app, BrowserWindow } = require('electron');

app
  .whenReady()
  .then(async () => {
    const address = process.argv.at(-1);
    if (!address?.startsWith('http://127.0.0.1:')) {
      app.exit(1);
      return;
    }
    const window = new BrowserWindow({
      width: 1280,
      height: 900,
      webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
    });
    await window.loadURL(address);
  })
  .catch(() => app.exit(1));
app.on('window-all-closed', () => app.quit());
