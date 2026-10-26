import { ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import type { createSavedFiltersStore } from './store';
import type { SavedFiltersResult } from '../../shared/saved-filters';
import { catalogueFailure } from '../../shared/catalogue-failure';

export function registerSavedFiltersHandlers(
  window: BrowserWindow,
  store: ReturnType<typeof createSavedFiltersStore>,
) {
  const handle = (channel: string, operation: (input: unknown) => Promise<SavedFiltersResult>) => {
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, async (event, input: unknown): Promise<SavedFiltersResult> => {
      if (
        event.sender !== window.webContents ||
        event.senderFrame !== window.webContents.mainFrame ||
        event.senderFrame.url !== window.webContents.getURL()
      )
        return catalogueFailure(
          'unavailable',
          'This filters request is not allowed from this window.',
        );
      try {
        return await operation(input);
      } catch {
        return catalogueFailure(
          'unavailable',
          'Your saved filters could not be reached. Please retry.',
        );
      }
    });
  };
  handle('filters:read', () => store.read());
  handle('filters:draft', (input) => store.saveDraft(input));
  handle('filters:save', (input) => store.savePreset(input));
  handle('filters:remove', (input) => store.removePreset(input));
}
