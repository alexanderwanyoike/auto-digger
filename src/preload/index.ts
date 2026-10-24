import { contextBridge, ipcRenderer } from 'electron';
import { createResearchAccessBridge } from './researchAccessBridge';
import { createDownloadJobsBridge } from './downloadJobsBridge';
import { createPreferencesBridge } from './preferencesBridge';
import { createStoreLinksBridge } from './storeLinksBridge';
import { createCrateBridge } from './crateBridge';
import { createDiscogsBridge } from './bridge';
import { createCatalogueBridge } from './catalogueBridge';
import { createAudioBridge } from './audioBridge';

contextBridge.exposeInMainWorld(
  'researchAccess',
  createResearchAccessBridge(async (channel) => {
    const result: unknown = await ipcRenderer.invoke(channel);
    return result;
  }),
);

contextBridge.exposeInMainWorld(
  'downloadJobs',
  createDownloadJobsBridge(async (channel, input) => {
    const result: unknown = await ipcRenderer.invoke(channel, input);
    return result;
  }),
);

contextBridge.exposeInMainWorld(
  'preferences',
  createPreferencesBridge(async (channel, input) => {
    const result: unknown = await ipcRenderer.invoke(channel, input);
    return result;
  }),
);

contextBridge.exposeInMainWorld(
  'storeLinks',
  createStoreLinksBridge(async (channel, input) => {
    const result: unknown = await ipcRenderer.invoke(channel, input);
    return result;
  }),
);

contextBridge.exposeInMainWorld('catalogue', {
  ...createCatalogueBridge(async (channel, input) => {
    const result: unknown = await ipcRenderer.invoke(channel, input);
    return result;
  }),
  onChanged: (callback: () => void) => {
    const listener = () => {
      callback();
    };
    ipcRenderer.on('catalogue:changed', listener);
    return () => {
      ipcRenderer.removeListener('catalogue:changed', listener);
    };
  },
});

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
