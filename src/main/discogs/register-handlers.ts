import { ipcMain, shell } from 'electron';
import type { BrowserWindow } from 'electron';
import { discogsChannels } from '../../shared/discogs';
import { discogsFailure } from '../../shared/discogs-failure';
import type { DiscogsResult } from '../../shared/discogs';
import type { createRememberedSession } from './remembered-session';
import type { createCrateTaste } from '../discovery/crate-taste';
import type { createDiscover, createStarterShelf } from '../discovery/discover';
import type { createDiscoveryHistory } from '../discovery/history';

type Operation = (input: unknown) => DiscogsResult<unknown> | Promise<DiscogsResult<unknown>>;

export function registerDiscogsHandlers(
  window: BrowserWindow,
  session: ReturnType<typeof createRememberedSession>,
  {
    discover,
    starterShelf,
    crateTaste,
    markOpened,
  }: {
    discover: ReturnType<typeof createDiscover>;
    starterShelf: ReturnType<typeof createStarterShelf>;
    crateTaste: ReturnType<typeof createCrateTaste>;
    markOpened: ReturnType<typeof createDiscoveryHistory>['opened'];
  },
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
  const remember = async <T>(result: DiscogsResult<T>, releaseId: (value: T) => number) => {
    if (result.ok) {
      const saved = await markOpened(releaseId(result.value));
      if (!saved.ok) process.stderr.write(`${saved.error.message}\n`);
    }
    return result;
  };
  handle(discogsChannels.dig, async (input) =>
    remember(await session.dig(input), (value) => value.release.id),
  );
  handle(discogsChannels.search, (input) => session.search(input));
  handle(discogsChannels.discover, discover);
  handle(discogsChannels.starterShelf, starterShelf);
  handle(discogsChannels.previewRelease, (id) => session.loadRelease(id));
  handle(discogsChannels.crateStyles, async () => {
    const taste = await crateTaste();
    if (!taste.ok) return discogsFailure('unavailable', taste.error.message);
    return { ok: true, value: taste.value.map(({ style }) => style) };
  });
  handle(discogsChannels.markSeen, async (id) => {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1)
      return discogsFailure('invalid-input', 'Choose a valid Discogs release.');
    const saved = await markOpened(id);
    return saved.ok ? saved : discogsFailure('unavailable', saved.error.message);
  });
  handle(discogsChannels.account, () => session.account());
  handle(discogsChannels.connect, (input) => session.connect(input));
  handle(discogsChannels.loadRelease, async (input) =>
    remember(await session.loadRelease(input), (value) => value.id),
  );
  handle(discogsChannels.disconnect, () => session.disconnect());
  handle(discogsChannels.openSettings, async () => {
    await shell.openExternal('https://www.discogs.com/settings/developers');
    return { ok: true, value: undefined };
  });
}
