import { dialog, ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import type { createPreferencesStore } from './store';
import { preferencesSchema } from '../../shared/preferences';
import type { PreferencesResult } from '../../shared/preferences';
import { catalogueFailure } from '../../shared/catalogueFailure';

export function registerPreferencesHandlers(
  window: BrowserWindow,
  store: ReturnType<typeof createPreferencesStore>,
) {
  const handle = (channel: string, operation: (input: unknown) => Promise<PreferencesResult>) => {
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, async (event, input: unknown): Promise<PreferencesResult> => {
      if (
        event.sender !== window.webContents ||
        event.senderFrame !== window.webContents.mainFrame ||
        event.senderFrame.url !== window.webContents.getURL()
      )
        return catalogueFailure(
          'unavailable',
          'This settings request is not allowed from this window.',
        );
      try {
        return await operation(input);
      } catch {
        return catalogueFailure('unavailable', 'Your settings could not be reached. Please retry.');
      }
    });
  };
  handle('preferences:read', () => store.read());
  handle('preferences:save', async (input) => {
    const parsed = preferencesSchema.omit({ directory: true }).strict().safeParse(input);
    if (!parsed.success)
      return catalogueFailure('invalid-input', 'Choose valid appearance and download options.');
    const current = await store.read();
    return current.ok ? store.save({ ...current.value, ...parsed.data }) : current;
  });
  handle('preferences:directory', async () => {
    const choice = await dialog.showOpenDialog(window, {
      title: 'Choose downloads folder',
      properties: ['openDirectory', 'createDirectory'],
    });
    const current = await store.read();
    if (!current.ok || choice.canceled) return current;
    const directory = choice.filePaths[0];
    if (!directory) return catalogueFailure('invalid-input', 'Choose a downloads directory.');
    try {
      await access(directory, constants.W_OK);
    } catch {
      return catalogueFailure(
        'storage',
        'This folder is not writable. Choose another downloads folder.',
      );
    }
    return store.save({ ...current.value, directory });
  });
}
