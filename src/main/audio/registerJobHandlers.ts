import { ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import type { createDownloadJobs } from './jobs';
import type { AudioResult } from '../../shared/audio';
import { audioFailure } from '../../shared/audioFailure';

export function registerDownloadJobHandlers(
  window: BrowserWindow,
  jobs: ReturnType<typeof createDownloadJobs>,
) {
  const operations: Record<string, (input: unknown) => AudioResult<unknown>> = {
    'jobs:list': () => jobs.list(),
    'jobs:start': (input) => jobs.start(input),
    'jobs:cancel': (id) => jobs.cancel(id),
    'jobs:retry': (id) => jobs.retry(id),
  };
  Object.entries(operations).forEach(([channel, operation]) => {
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, (event, input: unknown) => {
      if (
        event.sender !== window.webContents ||
        event.senderFrame !== window.webContents.mainFrame ||
        event.senderFrame.url !== window.webContents.getURL()
      )
        return audioFailure(
          'unavailable',
          'This download request is not allowed from this window.',
        );
      try {
        return operation(input);
      } catch {
        return audioFailure(
          'unavailable',
          'Your download queue could not be reached. Please retry.',
        );
      }
    });
  });
}
