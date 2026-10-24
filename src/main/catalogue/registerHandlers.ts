import { ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import { catalogueChannels } from '../../shared/catalogue';
import type { CatalogueViewResult } from '../../shared/catalogue';
import { catalogueFailure } from '../../shared/catalogueFailure';
import type { createCatalogueStore } from './store';

export function registerCatalogueHandlers(
  window: BrowserWindow,
  store: ReturnType<typeof createCatalogueStore>,
) {
  const handle = (channel: string, operation: (input: unknown) => Promise<CatalogueViewResult>) => {
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, async (event, input: unknown) => {
      if (
        event.sender !== window.webContents ||
        event.senderFrame !== window.webContents.mainFrame ||
        event.senderFrame.url !== window.webContents.getURL()
      )
        return catalogueFailure('unavailable', 'This request is not allowed from this window.');
      try {
        return await operation(input);
      } catch {
        return catalogueFailure('unavailable', 'Your crates are unavailable. Please retry.');
      }
    });
  };
  handle(catalogueChannels.view, (input) =>
    typeof input === 'string' || input === undefined
      ? store.view(input)
      : Promise.resolve(catalogueFailure('invalid-input', 'Choose an existing crate.')),
  );
  handle(catalogueChannels.create, (input) => store.create(input));
  handle(catalogueChannels.rename, (input) => store.rename(input));
  handle(catalogueChannels.deleteCrate, (input) => store.deleteCrate(input));
  handle(catalogueChannels.add, (input) => store.add(input));
  handle(catalogueChannels.remove, (input) => store.remove(input));
  handle(catalogueChannels.annotate, (input) => store.annotate(input));
}
