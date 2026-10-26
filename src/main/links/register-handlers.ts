import { ipcMain, shell } from 'electron';
import type { BrowserWindow } from 'electron';
import type { StoreLinkResult } from '../../shared/store-links';
import { storeUrl } from './store-url';

export function registerStoreLinkHandlers(window: BrowserWindow) {
  ipcMain.removeHandler('store:open');
  ipcMain.handle(
    'store:open',
    async (event, input: unknown): Promise<StoreLinkResult<undefined>> => {
      if (
        event.sender !== window.webContents ||
        event.senderFrame !== window.webContents.mainFrame ||
        event.senderFrame.url !== window.webContents.getURL()
      )
        return {
          ok: false,
          error: {
            code: 'unavailable',
            message: 'This store request is not allowed from this window.',
          },
        };
      const url = storeUrl(input);
      if (!url.ok) return url;
      try {
        await shell.openExternal(url.value);
        return { ok: true, value: undefined };
      } catch {
        return {
          ok: false,
          error: {
            code: 'unavailable',
            message: 'Your browser could not open this store. Please retry.',
          },
        };
      }
    },
  );
}
