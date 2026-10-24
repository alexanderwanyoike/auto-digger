import { contextBridge, ipcRenderer } from 'electron';
import { createCrateBridge } from './crateBridge';
import { createDiscogsBridge } from './bridge';
import { createAudioBridge } from './audioBridge';

contextBridge.exposeInMainWorld(
  'audioLibrary',
  createAudioBridge(async (channel, input) => {
    const result: unknown = await ipcRenderer.invoke(channel, input);
    return result;
  }),
);

contextBridge.exposeInMainWorld(
  'discogs',
  createDiscogsBridge(async (channel, input) => {
    const result: unknown = await ipcRenderer.invoke(channel, input);
    return result;
  }),
);

contextBridge.exposeInMainWorld(
  'crate',
  createCrateBridge(async (channel, input) => {
    const result: unknown = await ipcRenderer.invoke(channel, input);
    return result;
  }),
);
