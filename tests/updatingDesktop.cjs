const { app } = require('electron');
const { join } = require('node:path');
const { writeFileSync, mkdirSync } = require('node:fs');

Object.defineProperty(app, 'isPackaged', { get: () => true });
app.getVersion = () => '0.1.1';
const profile = app.getPath('userData');
mkdirSync(profile, { recursive: true });
const configuration = join(profile, 'updater.yml');
writeFileSync(
  configuration,
  JSON.stringify({
    provider: 'generic',
    url: process.env.AUTO_DIGGER_TEST_UPDATE_URL,
    updaterCacheDirName: 'auto-digger-update-test',
  }),
);
const { autoUpdater } = require('electron-updater');

autoUpdater.updateConfigPath = configuration;
autoUpdater.setFeedURL({ provider: 'generic', url: process.env.AUTO_DIGGER_TEST_UPDATE_URL });
autoUpdater.disableDifferentialDownload = true;
require('./encryptedDesktop.cjs');
