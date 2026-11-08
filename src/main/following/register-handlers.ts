import { ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import type { FollowingResult } from '../../shared/following';
import { catalogueFailure } from '../../shared/catalogue-failure';
import type { createFollowingStore } from './store';

export function registerFollowingHandlers(
  window: BrowserWindow,
  store: ReturnType<typeof createFollowingStore>,
) {
  const handle = (channel: string, operation: (input: unknown) => Promise<FollowingResult>) => {
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, async (event, input: unknown): Promise<FollowingResult> => {
      if (
        event.sender !== window.webContents ||
        event.senderFrame !== window.webContents.mainFrame ||
        event.senderFrame.url !== window.webContents.getURL()
      )
        return catalogueFailure(
          'unavailable',
          'This following request is not allowed from this window.',
        );
      try {
        return await operation(input);
      } catch {
        return catalogueFailure(
          'unavailable',
          'Your following list could not be reached. Please retry.',
        );
      }
    });
  };
  handle('following:read', () => store.read());
  handle('following:set', (input) => store.setFollowed(input));
}
