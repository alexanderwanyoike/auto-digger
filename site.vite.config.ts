import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { siteDownloads } from './scripts/site-downloads';

export default defineConfig({
  plugins: [siteDownloads()],
  root: resolve(import.meta.dirname, 'site'),
  base: '/auto-digger/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        home: resolve(import.meta.dirname, 'site/index.html'),
        setup: resolve(import.meta.dirname, 'site/setup/index.html'),
        soulseek: resolve(import.meta.dirname, 'site/soulseek/index.html'),
        cosine: resolve(import.meta.dirname, 'site/cosine/index.html'),
      },
    },
  },
  server: { host: '127.0.0.1', port: 4321, strictPort: true },
  preview: { host: '127.0.0.1', port: 4321, strictPort: true },
});
