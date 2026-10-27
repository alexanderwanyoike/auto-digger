import { app, BrowserWindow, nativeImage } from 'electron';
import { join } from 'node:path';
import { mkdtemp } from 'node:fs/promises';
import { createAudioPreviews } from './audio/previews';
import { createApplicationUpdates } from './updates/runtime';
import { registerUpdateHandlers } from './updates/register-handlers';
import { registerStoreLinkHandlers } from './links/register-handlers';
import type { Result } from '../shared/result';
import { createLegacyCrateStore } from './catalogue/legacy-crate-store';
import { createCatalogueStore } from './catalogue/store';
import { registerCatalogueHandlers } from './catalogue/register-handlers';
import { registerCrateHandlers } from './crate/register-handlers';
import { createRememberedSession } from './discogs/remembered-session';
import { createTokenStore } from './credentials/token-store';
import { electronEncryption } from './credentials/electron-encryption';
import { createDiscogsSession } from './discogs/session';
import { registerDiscogsHandlers } from './discogs/register-handlers';
import { createIndexedLibrary } from './audio/indexed-library';
import { registerSavedFiltersHandlers } from './filters/register-handlers';
import { registerPreferencesHandlers } from './settings/register-handlers';
import { createCommandRunner } from './audio/command';
import { createDownloadJobs } from './audio/jobs';
import { registerDownloadJobHandlers } from './audio/register-job-handlers';
import { createDownloader } from './audio/downloader';
import { registerAudioHandlers } from './audio/register-handlers';
import { registerAudioProtocol } from './audio/protocol';
import { createSoulseekSettings } from './soulseek/settings';
import { createSoulseekService } from './soulseek/service';
import { registerSoulseekHandlers } from './soulseek/register-handlers';
import { createResearchService } from './research/service';
import { createResearchRuntime } from './research/runtime';
import { registerResearchHandlers } from './research/register-handlers';

let discogsSession: ReturnType<typeof createRememberedSession> | undefined;
let crateStore: ReturnType<typeof createLegacyCrateStore> | undefined;
let catalogueStore: ReturnType<typeof createCatalogueStore> | undefined;
let audioLibrary: ReturnType<typeof createIndexedLibrary> | undefined;
let audioPreviews: ReturnType<typeof createAudioPreviews> | undefined;
let downloadJobs: ReturnType<typeof createDownloadJobs> | undefined;
let soulseekSettings: ReturnType<typeof createSoulseekSettings> | undefined;
let soulseek: ReturnType<typeof createSoulseekService> | undefined;
const audioCommands = createCommandRunner();
const downloader = createDownloader((args, timeout, signal, onLine) =>
  audioCommands.execute(args, timeout, signal, onLine),
);
let researchRuntime: ReturnType<typeof createResearchRuntime> | undefined;
let updates: ReturnType<typeof createApplicationUpdates>;
let closingCatalogue = false;
app.on('before-quit', (event) => {
  audioCommands.cancelAll();
  if (catalogueStore && !closingCatalogue) {
    event.preventDefault();
    closingCatalogue = true;
    Promise.resolve(researchRuntime?.stop())
      .then(() => downloadJobs?.close())
      .then(() => audioPreviews?.close())
      .then(() => soulseek?.close())
      .then(() => catalogueStore?.close())
      .then((result) => {
        if (result && !result.ok) process.stderr.write(`${result.error.message}\n`);
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
    registerPreferencesHandlers(window, catalogueStore.preferences);
    registerSavedFiltersHandlers(window, catalogueStore.filters);
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
    soulseekSettings ??= createSoulseekSettings(
      join(app.getPath('userData'), 'slskd.bin'),
      electronEncryption,
    );
    soulseek ??= createSoulseekService(() =>
      soulseekSettings ? soulseekSettings.load() : Promise.resolve({ ok: true, value: null }),
    );
    registerSoulseekHandlers(window, soulseekSettings, soulseek);
    audioPreviews ??= createAudioPreviews(
      await mkdtemp(join(app.getPath('temp'), 'auto-digger-previews-')),
      downloader,
      soulseek.receive,
    );
    if (!audioLibrary) {
      audioLibrary = createIndexedLibrary(
        downloadsDirectory,
        catalogueStore,
        downloader,
        fetch,
        soulseek.receive,
        audioPreviews,
      );
      registerAudioProtocol(audioLibrary, audioPreviews);
    }
    const library = audioLibrary;
    downloadJobs ??= createDownloadJobs((input, options) => library.download(input, options));
    registerDownloadJobHandlers(window, downloadJobs);
    registerAudioHandlers(window, audioLibrary, downloader, audioPreviews);
    registerDiscogsHandlers(window, discogsSession);
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
