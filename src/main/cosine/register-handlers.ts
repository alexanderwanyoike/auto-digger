import { ipcMain } from 'electron';
import type { BrowserWindow } from 'electron';
import { cosineFailure } from '../../shared/cosine-failure';
import type { createCosineService } from './service';

export function registerCosineHandlers(
  window: BrowserWindow,
  service: ReturnType<typeof createCosineService>,
) {
  const operations = {
    status: () => service.status(),
    'save-key': (input: unknown) => service.saveKey(input),
    forget: () => service.forget(),
    similar: (input: unknown) => service.similar(input),
    resolve: (input: unknown) => service.resolve(input),
  };
  Object.entries(operations).forEach(([name, operation]) => {
    ipcMain.removeHandler(`cosine:${name}`);
    ipcMain.handle(`cosine:${name}`, async (event, input: unknown) => {
      if (
        event.sender !== window.webContents ||
        event.senderFrame !== window.webContents.mainFrame ||
        event.senderFrame.url !== window.webContents.getURL()
      )
        return cosineFailure(
          'unavailable',
          'This request is available only in the Auto Digger window.',
        );
      try {
        return await operation(input);
      } catch {
        return cosineFailure(
          'unavailable',
          'Cosine could not complete this request. Please retry.',
        );
      }
    });
  });
}
