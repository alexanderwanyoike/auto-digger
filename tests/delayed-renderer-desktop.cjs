const { app, session } = require('electron');

app.whenReady().then(() => {
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['file://*/*'] }, (details, done) => {
    // A slow initial script exposes reloads that interrupt desktop startup.
    if (details.resourceType === 'script') setTimeout(() => done({}), 1000);
    else done({});
  });
});

require('./encrypted-desktop.cjs');
