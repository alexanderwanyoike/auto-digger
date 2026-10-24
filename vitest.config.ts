import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    restoreMocks: true,
    unstubGlobals: true,
    projects: [
      {
        test: {
          name: 'main',
          environment: 'node',
          include: ['src/{main,shared,preload}/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'renderer',
          environment: 'jsdom',
          setupFiles: ['tests/setup.ts'],
          include: ['src/renderer/**/*.test.{ts,tsx}'],
        },
      },
    ],
  },
});
