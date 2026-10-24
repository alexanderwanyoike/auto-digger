import { ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import { crateChannels } from '../../shared/crate';
import type { CrateResult } from '../../shared/crate';
import { crateFailure } from '../../shared/crateFailure';
import type { createLegacyCrateStore } from '../catalogue/legacyCrateStore';

export function registerCrateHandlers(
  window: BrowserWindow,
  store: ReturnType<typeof createLegacyCrateStore>,
) {
  const handle = (channel: string, operation: (input: unknown) => Promise<CrateResult>) => {
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, async (event, input: unknown) => {
      if (
        event.sender !== window.webContents ||
        event.senderFrame !== window.webContents.mainFrame ||
        event.senderFrame.url !== window.webContents.getURL()
      )
        return crateFailure('unavailable', 'This request is not allowed from this window.');
      try {
        return await operation(input);
      } catch {
        return crateFailure('unavailable', 'Crate storage is unavailable. Please retry.');
      }
    });
  };
  handle(crateChannels.list, () => store.list());
  handle(crateChannels.save, (input) => store.save(input));
  handle(crateChannels.remove, (input) => store.remove(input));
}
