import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { siteDownloads } from './scripts/siteDownloads';

export default defineConfig({
  plugins: [siteDownloads()],
  root: resolve(import.meta.dirname, 'site'),
  base: '/auto-digger/',
  build: { outDir: 'dist', emptyOutDir: true },
  server: { host: '127.0.0.1', port: 4321, strictPort: true },
  preview: { host: '127.0.0.1', port: 4321, strictPort: true },
});
