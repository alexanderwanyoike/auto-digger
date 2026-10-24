import { contextBridge, ipcRenderer } from 'electron';
import { createStoreLinksBridge } from './storeLinksBridge';
import { createCrateBridge } from './crateBridge';
import { createDiscogsBridge } from './bridge';
import { createCatalogueBridge } from './catalogueBridge';
import { createAudioBridge } from './audioBridge';

contextBridge.exposeInMainWorld(
  'storeLinks',
  createStoreLinksBridge(async (channel, input) => {
    const result: unknown = await ipcRenderer.invoke(channel, input);
    return result;
  }),
);

contextBridge.exposeInMainWorld(
  'catalogue',
  createCatalogueBridge(async (channel, input) => {
    const result: unknown = await ipcRenderer.invoke(channel, input);
    return result;
  }),
);

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
