import { ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import type { AudioResult } from '../../shared/audio';
import { audioFailure } from '../../shared/audioFailure';
import type { createSoulseekSettings } from './settings';
import type { createSoulseekService } from './service';

export function registerSoulseekHandlers(
  window: BrowserWindow,
  settings: ReturnType<typeof createSoulseekSettings>,
  service: ReturnType<typeof createSoulseekService>,
) {
  const operations: Record<string, (input: unknown) => Promise<AudioResult<unknown>>> = {
    settings: () => settings.status(),
    configure: (input) => settings.configure(input),
    disconnect: async () => {
      await service.close();
      return settings.disconnect();
    },
    search: (input) => service.search(input),
    results: (input) => service.results(input),
    stop: (input) => service.stop(input),
  };
  Object.entries(operations).forEach(([name, operation]) => {
    const channel = `soulseek:${name}`;
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, async (event, input: unknown) => {
      if (
        event.sender !== window.webContents ||
        event.senderFrame !== window.webContents.mainFrame ||
        event.senderFrame.url !== window.webContents.getURL()
      )
        return audioFailure(
          'unavailable',
          'This Soulseek request is not allowed from this window.',
        );
      try {
        return await operation(input);
      } catch {
        return audioFailure(
          'unavailable',
          'Soulseek could not complete this request. Please retry.',
        );
      }
    });
  });
}
