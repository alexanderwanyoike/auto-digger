import { ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import { createApiFeasibilityPrototype } from './api-feasibility';
import { loadRecommendationRelease } from './recommendation-release';

const service = createApiFeasibilityPrototype();

export function registerApiFeasibility(window: BrowserWindow) {
  if (process.env.AUTO_DIGGER_API_PROTOTYPE !== '1') return;
  const operations = {
    status: () => service.status(),
    configure: (input: unknown) => service.configure(input),
    forget: () => service.forget(),
    probe: (input: unknown) => service.probe(input),
    release: (input: unknown) => loadRecommendationRelease(input),
  };
  Object.entries(operations).forEach(([operation, handler]) => {
    const channel = `api-feasibility:${operation}`;
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, async (event, input: unknown) => {
      if (
        event.sender !== window.webContents ||
        event.senderFrame !== window.webContents.mainFrame ||
        event.senderFrame.url !== window.webContents.getURL()
      )
        return {
          ok: false,
          error: {
            code: 'unavailable',
            message: 'This experiment is available only in its desktop window.',
          },
        };
      try {
        return await handler(input);
      } catch {
        return {
          ok: false,
          error: {
            code: 'unavailable',
            message: 'The experiment could not complete this request.',
          },
        };
      }
    });
  });
}
