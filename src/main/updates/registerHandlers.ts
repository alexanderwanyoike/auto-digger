import { ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import type { createApplicationUpdates } from './runtime';
import type { UpdateResult, UpdateState } from '../../shared/updates';

export function registerUpdateHandlers(
  window: BrowserWindow,
  updates: ReturnType<typeof createApplicationUpdates>,
) {
  const operations = {
    status: (): UpdateResult<UpdateState> => ({
      ok: true,
      value: updates?.status() ?? { stage: 'disabled' },
    }),
    check: () => updates?.check(),
    download: () => updates?.download(),
    install: () => updates?.install(),
  };
  Object.entries(operations).forEach(([name, operation]) => {
    const channel = `updates:${name}`;
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, async (event): Promise<UpdateResult<UpdateState>> => {
      if (
        event.sender !== window.webContents ||
        event.senderFrame !== window.webContents.mainFrame ||
        event.senderFrame.url !== window.webContents.getURL()
      )
        return { ok: false, error: 'This update request is not allowed from this window.' };
      try {
        return (
          (await operation()) ?? { ok: false, error: 'Updates are available in installed builds.' }
        );
      } catch {
        return { ok: false, error: 'The update could not finish. Please retry.' };
      }
    });
  });
}
