import { app, dialog, ipcMain, shell } from 'electron';
import type { BrowserWindow } from 'electron';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createResearchExtension } from './extension';
import { researchAccessChannels } from '../../shared/researchAccess';
import type { ResearchAccess } from '../../shared/researchAccess';
import type { CatalogueResult } from '../../shared/catalogue';
import { catalogueFailure } from '../../shared/catalogueFailure';
import type { createResearchRuntime } from './runtime';
import type { createResearchStore } from './store';
import { openResearchSource } from './openSource';

export function registerResearchHandlers(
  window: BrowserWindow,
  runtime: ReturnType<typeof createResearchRuntime>,
  store: ReturnType<typeof createResearchStore>,
) {
  ipcMain.removeHandler(researchAccessChannels.saveExtension);
  ipcMain.handle(
    researchAccessChannels.saveExtension,
    async (event): Promise<CatalogueResult<string | null>> => {
      if (
        event.sender !== window.webContents ||
        event.senderFrame !== window.webContents.mainFrame ||
        event.senderFrame.url !== window.webContents.getURL()
      )
        return catalogueFailure(
          'unavailable',
          'This extension request is not allowed from this window.',
        );
      const access = runtime.status();
      const file = access.configuration.args[2];
      if (!access.enabled || !file)
        return catalogueFailure('unavailable', 'Enable MCP before saving the extension.');
      try {
        const destination = await dialog.showSaveDialog(window, {
          title: 'Save Auto Digger MCP',
          defaultPath: join(app.getPath('downloads'), 'Auto Digger MCP.mcpb'),
          filters: [{ name: 'Claude extension', extensions: ['mcpb'] }],
        });
        if (destination.canceled || !destination.filePath) return { ok: true, value: null };
        const bundle = await createResearchExtension(file);
        if (!bundle.ok) return bundle;
        await writeFile(destination.filePath, bundle.value, { mode: 0o600 });
        return { ok: true, value: destination.filePath };
      } catch {
        return catalogueFailure(
          'storage',
          'The extension could not be saved. Choose another folder and try again.',
        );
      }
    },
  );
  ipcMain.removeHandler(researchAccessChannels.openSource);
  ipcMain.handle(researchAccessChannels.openSource, async (event, input: unknown) => {
    if (
      event.sender !== window.webContents ||
      event.senderFrame !== window.webContents.mainFrame ||
      event.senderFrame.url !== window.webContents.getURL()
    )
      return catalogueFailure(
        'unavailable',
        'This source request is not allowed from this window.',
      );
    return openResearchSource(store, input, (url) => shell.openExternal(url));
  });
  const handle = (channel: string, operation: () => Promise<CatalogueResult<ResearchAccess>>) => {
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, async (event): Promise<CatalogueResult<ResearchAccess>> => {
      if (
        event.sender !== window.webContents ||
        event.senderFrame !== window.webContents.mainFrame ||
        event.senderFrame.url !== window.webContents.getURL()
      )
        return catalogueFailure(
          'unavailable',
          'This research request is not allowed from this window.',
        );
      try {
        return await operation();
      } catch {
        return catalogueFailure(
          'unavailable',
          'Research access could not be changed. Please retry.',
        );
      }
    });
  };
  handle(researchAccessChannels.status, () =>
    Promise.resolve({ ok: true, value: runtime.status() }),
  );
  handle(researchAccessChannels.start, () => runtime.start());
  handle(researchAccessChannels.stop, () => runtime.stop());
}
