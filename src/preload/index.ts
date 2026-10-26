import { contextBridge, ipcRenderer } from 'electron';
import { createSavedFiltersBridge } from './saved-filters-bridge';
import { createUpdatesBridge } from './updates-bridge';
import { createResearchAccessBridge } from './research-access-bridge';
import { createDownloadJobsBridge } from './download-jobs-bridge';
import { createPreferencesBridge } from './preferences-bridge';
import { createStoreLinksBridge } from './store-links-bridge';
import { createCrateBridge } from './crate-bridge';
import { createDiscogsBridge } from './bridge';
import { createCatalogueBridge } from './catalogue-bridge';
import { createAudioBridge } from './audio-bridge';
import { createSoulseekBridge } from './soulseek-bridge';

contextBridge.exposeInMainWorld(
  'soulseek',
  createSoulseekBridge(async (channel, input) => {
    const result: unknown = await ipcRenderer.invoke(channel, input);
    return result;
  }),
);

contextBridge.exposeInMainWorld(
  'researchAccess',
  createResearchAccessBridge(async (channel, input) => {
    const result: unknown = await ipcRenderer.invoke(channel, input);
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

contextBridge.exposeInMainWorld(
  'updates',
  createUpdatesBridge(async (channel) => {
    const result: unknown = await ipcRenderer.invoke(channel);
    return result;
  }),
);

contextBridge.exposeInMainWorld(
  'savedFilters',
  createSavedFiltersBridge(async (channel, input) => {
    const result: unknown = await ipcRenderer.invoke(channel, input);
    return result;
  }),
);
