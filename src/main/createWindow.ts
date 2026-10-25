import { app, BrowserWindow, nativeImage, net } from 'electron';
import { join } from 'node:path';
import { createApplicationUpdates } from './updates/runtime';
import { registerUpdateHandlers } from './updates/registerHandlers';
import { registerStoreLinkHandlers } from './links/registerHandlers';
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
import { createIndexedLibrary } from './audio/indexedLibrary';
import { registerPreferencesHandlers } from './settings/registerHandlers';
import { createCommandRunner } from './audio/command';
import { createDownloadJobs } from './audio/jobs';
import { registerDownloadJobHandlers } from './audio/registerJobHandlers';
import { createDownloader } from './audio/downloader';
import { registerAudioHandlers } from './audio/registerHandlers';
import { registerAudioProtocol } from './audio/protocol';
import { createPreviewSession } from './audio/previewSession';
import { createResearchService } from './research/service';
import { createResearchRuntime } from './research/runtime';
import { registerResearchHandlers } from './research/registerHandlers';
import { createPreviewResolver } from './audio/previewResolver';

let discogsSession: ReturnType<typeof createRememberedSession> | undefined;
let crateStore: ReturnType<typeof createLegacyCrateStore> | undefined;
let catalogueStore: ReturnType<typeof createCatalogueStore> | undefined;
let audioLibrary: ReturnType<typeof createIndexedLibrary> | undefined;
let downloadJobs: ReturnType<typeof createDownloadJobs> | undefined;
const audioCommands = createCommandRunner();
const downloader = createDownloader((args, timeout, signal, onLine) =>
  audioCommands.execute(args, timeout, signal, onLine),
);
const previews = createPreviewSession(
  createPreviewResolver((args, timeout, signal) => audioCommands.execute(args, timeout, signal)),
  (input, options) => net.fetch(input instanceof URL ? input.href : input, options),
);
let researchRuntime: ReturnType<typeof createResearchRuntime> | undefined;
let closingCatalogue = false;
let shutdown: Promise<Result<undefined, string>> | undefined;
let updates: ReturnType<typeof createApplicationUpdates>;

function closeServices(): Promise<Result<undefined, string>> {
  shutdown ??= (async () => {
    audioCommands.cancelAll();
    previews.stop();
    const research = await researchRuntime?.stop();
    if (research && !research.ok) process.stderr.write(`${research.error.message}\n`);
    await downloadJobs?.close();
    const closed = await catalogueStore?.close();
    closingCatalogue = true;
    return closed && !closed.ok
      ? { ok: false, error: closed.error.message }
      : { ok: true, value: undefined };
  })();
  return shutdown;
}
app.on('before-quit', (event) => {
  if (catalogueStore && !closingCatalogue) {
    event.preventDefault();
    closeServices()
      .then((result) => {
        if (!result.ok) process.stderr.write(`${result.error}\n`);
        app.quit();
      })
      .catch(() => {
        closingCatalogue = true;
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
    registerPreferencesHandlers(window, catalogueStore.preferences);
    registerStoreLinkHandlers(window);
    updates ??= createApplicationUpdates();
    registerUpdateHandlers(window, updates);
    discogsSession ??= createRememberedSession(
      createDiscogsSession(),
      createTokenStore(join(app.getPath('userData'), 'discogs-token.bin'), electronEncryption),
    );
    const research = createResearchService(catalogueStore, discogsSession, () => {
      BrowserWindow.getAllWindows().forEach((open) => {
        if (!open.isDestroyed()) open.webContents.send('catalogue:changed');
      });
    });
    researchRuntime ??= createResearchRuntime(
      join(app.getPath('userData'), 'mcp-connection.json'),
      join(import.meta.dirname, 'mcp.js'),
      (input, signal) => research.execute(input, signal),
    );
    registerResearchHandlers(window, researchRuntime, catalogueStore.research);
    registerCrateHandlers(window, crateStore);
    const downloadsDirectory = join(app.getPath('music'), 'Auto Digger');
    if (!audioLibrary) {
      audioLibrary = createIndexedLibrary(downloadsDirectory, catalogueStore, downloader);
      registerAudioProtocol(audioLibrary, previews);
    }
    const library = audioLibrary;
    downloadJobs ??= createDownloadJobs((input, options) => library.download(input, options));
    registerDownloadJobHandlers(window, downloadJobs);
    registerAudioHandlers(window, audioLibrary, downloader, previews);
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
