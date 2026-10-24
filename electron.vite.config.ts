import { resolve } from 'node:path';
import { defineConfig } from 'electron-vite';
import renderer from './vite.config';

export default defineConfig({
  main: {
    build: {
      rolldownOptions: {
        input: { index: resolve('src/main/index.ts'), mcp: resolve('src/mcp/index.ts') },
      },
    },
  },
  preload: {
    build: {
      externalizeDeps: false,
      rolldownOptions: { output: { format: 'cjs', entryFileNames: 'index.cjs' } },
    },
  },
  renderer,
});
