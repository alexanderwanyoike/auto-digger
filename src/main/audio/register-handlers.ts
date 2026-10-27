import { ipcMain, shell } from 'electron';
import type { BrowserWindow } from 'electron';
import { audioChannels } from '../../shared/audio';
import type { AudioResult } from '../../shared/audio';
import { audioFailure } from '../../shared/audio-failure';
import type { createIndexedLibrary } from './indexed-library';
import type { createDownloader } from './downloader';
import { audioPreviewChannels } from '../../shared/audio-previews';
import type { createAudioPreviews } from './previews';

export function registerAudioHandlers(
  window: BrowserWindow,
  library: ReturnType<typeof createIndexedLibrary>,
  downloader: ReturnType<typeof createDownloader>,
  previews: ReturnType<typeof createAudioPreviews>,
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
  handle(audioPreviewChannels.prepare, (input) => previews.prepare(input));
  handle(audioPreviewChannels.cancel, (input) =>
    Promise.resolve(
      typeof input === 'string'
        ? previews.cancel(input)
        : audioFailure('invalid-input', 'Choose an active preview.'),
    ),
  );
  handle(audioChannels.reveal, async (input) => {
    if (input === undefined) {
      const ready = await library.list();
      if (!ready.ok) return ready;
      const root = await library.root();
      if (!root.ok) return root;
      const error = await shell.openPath(root.value);
      if (error)
        return audioFailure(
          'unavailable',
          'Your file explorer could not open the downloads folder.',
        );
    } else {
      if (typeof input !== 'string') return audioFailure('invalid-input', 'Choose a saved track.');
      const track = await library.location(input);
      if (!track.ok) return track;
      shell.showItemInFolder(track.value.file);
    }
    return { ok: true, value: undefined };
  });
}
