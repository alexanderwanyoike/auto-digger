import { app, BrowserWindow, nativeImage, net } from 'electron';
import { join } from 'node:path';
import type { Result } from '../shared/result';
import { createLegacyCrateStore } from './catalogue/legacyCrateStore';
import { createCatalogueStore } from './catalogue/store';
import { registerCatalogueHandlers } from './catalogue/registerHandlers';
import { registerCrateHandlers } from './crate/registerHandlers';
import { createRememberedSession } from './discogs/rememberedSession';
import { createTokenStore } from './credentials/tokenStore';
import { electronEncryption } from './credentials/electronEncryption';
import { createDiscogsSession } from './discogs/session';
import { registerDiscogsHandlers } from './discogs/registerHandlers';
import { createAudioLibrary } from './audio/library';
import { createCommandRunner } from './audio/command';
import { createDownloader } from './audio/downloader';
import { registerAudioHandlers } from './audio/registerHandlers';
import { registerAudioProtocol } from './audio/protocol';
import { createPreviewSession } from './audio/previewSession';
import { createPreviewResolver } from './audio/previewResolver';

let discogsSession: ReturnType<typeof createRememberedSession> | undefined;
let crateStore: ReturnType<typeof createLegacyCrateStore> | undefined;
let catalogueStore: ReturnType<typeof createCatalogueStore> | undefined;
let audioLibrary: ReturnType<typeof createAudioLibrary> | undefined;
const audioCommands = createCommandRunner();
const downloader = createDownloader((args, timeout) => audioCommands.execute(args, timeout));
const previews = createPreviewSession(
  createPreviewResolver((args, timeout, signal) => audioCommands.execute(args, timeout, signal)),
  (input, options) => net.fetch(input instanceof URL ? input.href : input, options),
);
let closingCatalogue = false;
app.on('before-quit', (event) => {
  audioCommands.cancelAll();
  previews.stop();
  if (catalogueStore && !closingCatalogue) {
    event.preventDefault();
    closingCatalogue = true;
    catalogueStore
      .close()
      .then((result) => {
        if (!result.ok) process.stderr.write(`${result.error.message}\n`);
        app.quit();
      })
      .catch(() => {
        app.quit();
      });
  }
});

export async function createWindow(): Promise<Result<undefined, string>> {
  let window: BrowserWindow | undefined;
  try {
    const iconFile = join(
      import.meta.dirname,
      '../../resources/icons',
      process.platform === 'win32' ? 'icon.ico' : 'icon.png',
    );
    const icon = nativeImage.createFromPath(iconFile);
    if (icon.isEmpty())
      return {
        ok: false,
        error:
          'The app icon could not load. Restore the resources/icons folder and restart Auto Digger.',
      };
    if (process.platform === 'darwin') app.dock?.setIcon(icon);
    window = new BrowserWindow({
      icon,
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
    catalogueStore ??= createCatalogueStore(
      join(app.getPath('userData'), 'catalog.sqlite'),
      join(app.getPath('userData'), 'crate.json'),
    );
    crateStore ??= createLegacyCrateStore(catalogueStore);
    registerCatalogueHandlers(window, catalogueStore);
    discogsSession ??= createRememberedSession(
      createDiscogsSession(),
      createTokenStore(join(app.getPath('userData'), 'discogs-token.bin'), electronEncryption),
    );
    registerCrateHandlers(window, crateStore);
    const downloadsDirectory = join(app.getPath('music'), 'Auto Digger');
    if (!audioLibrary) {
      audioLibrary = createAudioLibrary(downloadsDirectory, downloader);
      registerAudioProtocol(audioLibrary, downloadsDirectory, previews);
    }
    registerAudioHandlers(window, audioLibrary, downloader, downloadsDirectory, previews);
    registerDiscogsHandlers(window, discogsSession);
    window.on('closed', () => {
      previews.stop();
    });
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
