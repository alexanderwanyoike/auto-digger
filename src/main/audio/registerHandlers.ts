import { ipcMain, shell } from 'electron';
import type { BrowserWindow } from 'electron';
import { join } from 'node:path';
import { audioChannels } from '../../shared/audio';
import type { AudioResult } from '../../shared/audio';
import { audioFailure } from '../../shared/audioFailure';
import type { createAudioLibrary } from './library';
import type { createDownloader } from './downloader';

export function registerAudioHandlers(
  window: BrowserWindow,
  library: ReturnType<typeof createAudioLibrary>,
  downloader: ReturnType<typeof createDownloader>,
  directory: string,
) {
  const handle = (
    channel: string,
    operation: (input: unknown) => Promise<AudioResult<unknown>>,
  ) => {
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, async (event, input: unknown) => {
      if (
        event.sender !== window.webContents ||
        event.senderFrame !== window.webContents.mainFrame ||
        event.senderFrame.url !== window.webContents.getURL()
      )
        return audioFailure('unavailable', 'This request is not allowed from this window.');
      try {
        return await operation(input);
      } catch {
        return audioFailure('unavailable', 'Your audio library is unavailable. Please retry.');
      }
    });
  };
  handle(audioChannels.list, () => library.list());
  handle(audioChannels.probe, (input) =>
    typeof input === 'string'
      ? downloader.probe(input)
      : Promise.resolve(audioFailure('invalid-input', 'Choose a supported YouTube source.')),
  );
  handle(audioChannels.download, (input) => library.download(input));
  handle(audioChannels.reveal, async (input) => {
    if (input === undefined) {
      const ready = await library.list();
      if (!ready.ok) return ready;
      const error = await shell.openPath(directory);
      if (error)
        return audioFailure(
          'unavailable',
          'Your file explorer could not open the downloads folder.',
        );
    } else {
      if (typeof input !== 'string') return audioFailure('invalid-input', 'Choose a saved track.');
      const track = await library.find(input);
      if (!track.ok) return track;
      shell.showItemInFolder(join(directory, track.value.filename));
    }
    return { ok: true, value: undefined };
  });
}
