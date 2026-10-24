import { ipcMain, shell } from 'electron';
import type { BrowserWindow } from 'electron';
import { discogsChannels } from '../../shared/discogs';
import { discogsFailure } from '../../shared/discogsFailure';
import type { DiscogsResult } from '../../shared/discogs';
import type { createDiscogsSession } from './session';

type Operation = (input: unknown) => DiscogsResult<unknown> | Promise<DiscogsResult<unknown>>;

export function registerDiscogsHandlers(
  window: BrowserWindow,
  session: ReturnType<typeof createDiscogsSession>,
) {
  const handle = (channel: string, operation: Operation) => {
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, async (event, input: unknown) => {
      if (
        event.sender !== window.webContents ||
        event.senderFrame !== window.webContents.mainFrame ||
        event.senderFrame.url !== window.webContents.getURL()
      ) {
        return discogsFailure('unavailable', 'This request is not allowed from this window.');
      }
      try {
        return await operation(input);
      } catch {
        return discogsFailure('unavailable', 'Discogs is unavailable. Please try again.');
      }
    });
  };
  handle(discogsChannels.search, (input) => session.search(input));
  handle(discogsChannels.account, () => session.account());
  handle(discogsChannels.connect, (input) => session.connect(input));
  handle(discogsChannels.loadRelease, (input) => session.loadRelease(input));
  handle(discogsChannels.disconnect, () => session.disconnect());
  handle(discogsChannels.openSettings, async () => {
    await shell.openExternal('https://www.discogs.com/settings/developers');
    return { ok: true, value: undefined };
  });
}
