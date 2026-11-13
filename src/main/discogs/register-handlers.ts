import { ipcMain, shell } from 'electron';
import type { BrowserWindow } from 'electron';
import type { createDiscoveryPages } from '../discovery/discovery-pages';
import { discogsChannels } from '../../shared/discogs';
import { discogsFailure } from '../../shared/discogs-failure';
import type { DiscogsRelease, DiscogsResult } from '../../shared/discogs';
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
    discoveryPages,
    crateTaste,
    history,
  }: {
    discover: ReturnType<typeof createDiscover>;
    starterShelf: ReturnType<typeof createStarterShelf>;
    discoveryPages: ReturnType<typeof createDiscoveryPages>;
    crateTaste: ReturnType<typeof createCrateTaste>;
    history: ReturnType<typeof createDiscoveryHistory>;
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
  const remember = async <T>(
    result: DiscogsResult<T>,
    releaseFor: (value: T) => DiscogsRelease,
  ) => {
    if (result.ok) {
      const release = releaseFor(result.value);
      const saved = await history.record({
        id: release.id,
        title: release.title,
        artist: release.artists.join(', '),
        artworkUrl: release.artworkUrl,
        activity: 'opened',
      });
      if (!saved.ok) process.stderr.write(`${saved.error.message}\n`);
    }
    return result;
  };
  handle(discogsChannels.dig, async (input) =>
    remember(await session.dig(input), (value) => value.release),
  );
  handle(discogsChannels.topicArtwork, (input) => session.topicArtwork(input));
  handle(discogsChannels.search, (input) => session.search(input));
  handle(discogsChannels.discover, (input) => {
    if (typeof input === 'object' && input !== null && 'topic' in input && 'background' in input)
      return discover(input.topic, input.background === true);
    return discover(input);
  });
  handle(discogsChannels.starterShelf, () => starterShelf());
  handle(discogsChannels.expandDiscovery, discoveryPages);
  handle(discogsChannels.previewRelease, (id) => session.loadRelease(id));
  handle(discogsChannels.crateStyles, async () => {
    const taste = await crateTaste();
    if (!taste.ok) return discogsFailure('unavailable', taste.error.message);
    return { ok: true, value: taste.value.map(({ style }) => style) };
  });
  handle(discogsChannels.discoveryHistory, async () => {
    const result = await history.list();
    return result.ok ? result : discogsFailure('unavailable', result.error.message);
  });
  handle(discogsChannels.recordDiscovery, async (input) => {
    const result = await history.record(input);
    if (result.ok) return result;
    return discogsFailure(
      result.error.code === 'invalid-input' ? 'invalid-input' : 'unavailable',
      result.error.message,
    );
  });
  handle(discogsChannels.markSeen, async (id) => {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1)
      return discogsFailure('invalid-input', 'Choose a valid Discogs release.');
    const saved = await history.opened(id);
    return saved.ok ? saved : discogsFailure('unavailable', saved.error.message);
  });
  handle(discogsChannels.account, () => session.account());
  handle(discogsChannels.connect, (input) => session.connect(input));
  handle(discogsChannels.loadRelease, async (input) =>
    remember(await session.loadRelease(input), (value) => value),
  );
  handle(discogsChannels.disconnect, () => session.disconnect());
  handle(discogsChannels.openSettings, async () => {
    await shell.openExternal('https://www.discogs.com/settings/developers');
    return { ok: true, value: undefined };
  });
}
