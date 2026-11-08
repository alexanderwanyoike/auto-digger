import { ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import type { PlaylistsResult } from '../../shared/playlists';
import { catalogueFailure } from '../../shared/catalogue-failure';
import type { createPlaylistsStore } from './store';

export function registerPlaylistsHandlers(
  window: BrowserWindow,
  store: ReturnType<typeof createPlaylistsStore>,
) {
  const handle = (channel: string, operation: (input: unknown) => Promise<PlaylistsResult>) => {
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, async (event, input: unknown): Promise<PlaylistsResult> => {
      if (
        event.sender !== window.webContents ||
        event.senderFrame !== window.webContents.mainFrame ||
        event.senderFrame.url !== window.webContents.getURL()
      )
        return catalogueFailure(
          'unavailable',
          'This playlist request is not allowed from this window.',
        );
      try {
        return await operation(input);
      } catch {
        return catalogueFailure(
          'unavailable',
          'Your playlists could not be reached. Please retry.',
        );
      }
    });
  };
  handle('playlists:read', () => store.read());
  handle('playlists:create', (name) => store.create(name));
  handle('playlists:add', (input) => store.add(input));
  handle('playlists:remove', (input) => store.remove(input));
}
