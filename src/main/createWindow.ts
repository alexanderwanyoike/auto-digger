import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';
import type { Result } from '../shared/result';
import { createCrateStore } from './crate/store';
import { registerCrateHandlers } from './crate/registerHandlers';
import { createDiscogsSession } from './discogs/session';
import { registerPlayerIdentity } from './youtube/registerIdentity';
import { registerDiscogsHandlers } from './discogs/registerHandlers';

const discogsSession = createDiscogsSession();
let crateStore: ReturnType<typeof createCrateStore> | undefined;

export async function createWindow(): Promise<Result<undefined, string>> {
  let window: BrowserWindow | undefined;
  try {
    window = new BrowserWindow({
      title: 'Auto Digger',
      width: 1180,
      height: 860,
      minWidth: 900,
      minHeight: 780,
      show: false,
      backgroundColor: '#25292e',
      autoHideMenuBar: true,
      webPreferences: {
        preload: join(import.meta.dirname, '../preload/index.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
      },
    });
    crateStore ??= createCrateStore(join(app.getPath('userData'), 'crate.json'));
    registerCrateHandlers(window, crateStore);
    registerDiscogsHandlers(window, discogsSession);
    registerPlayerIdentity(window.webContents.session);
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event) => {
      event.preventDefault();
    });
    window.webContents.session.setPermissionRequestHandler((_contents, _permission, respond) => {
      respond(false);
    });
    const developmentUrl = process.env.ELECTRON_RENDERER_URL;
    if (developmentUrl) {
      const url = new URL(developmentUrl);
      if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1') {
        window.destroy();
        return { ok: false, error: 'The development renderer must use the local Vite server.' };
      }
      await window.loadURL(url.href);
    } else {
      await window.loadFile(join(import.meta.dirname, '../renderer/index.html'));
    }
    window.show();
    return { ok: true, value: undefined };
  } catch (error) {
    window?.destroy();
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'The window could not open.',
    };
  }
}
