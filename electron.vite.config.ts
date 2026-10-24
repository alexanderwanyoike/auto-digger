import { defineConfig } from 'electron-vite';
import renderer from './vite.config';

export default defineConfig({
  main: {},
  preload: {
    build: {
      externalizeDeps: false,
      rolldownOptions: { output: { format: 'cjs', entryFileNames: 'index.cjs' } },
    },
  },
  renderer,
});
