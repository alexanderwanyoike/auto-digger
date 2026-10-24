import { ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import { researchAccessChannels } from '../../shared/researchAccess';
import type { ResearchAccess } from '../../shared/researchAccess';
import type { CatalogueResult } from '../../shared/catalogue';
import { catalogueFailure } from '../../shared/catalogueFailure';
import type { createResearchRuntime } from './runtime';

export function registerResearchHandlers(
  window: BrowserWindow,
  runtime: ReturnType<typeof createResearchRuntime>,
) {
  const handle = (channel: string, operation: () => Promise<CatalogueResult<ResearchAccess>>) => {
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, async (event): Promise<CatalogueResult<ResearchAccess>> => {
      if (
        event.sender !== window.webContents ||
        event.senderFrame !== window.webContents.mainFrame ||
        event.senderFrame.url !== window.webContents.getURL()
      )
        return catalogueFailure(
          'unavailable',
          'This research request is not allowed from this window.',
        );
      try {
        return await operation();
      } catch {
        return catalogueFailure(
          'unavailable',
          'Research access could not be changed. Please retry.',
        );
      }
    });
  };
  handle(researchAccessChannels.status, () =>
    Promise.resolve({ ok: true, value: runtime.status() }),
  );
  handle(researchAccessChannels.start, () => runtime.start());
  handle(researchAccessChannels.stop, () => runtime.stop());
}
