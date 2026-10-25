import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fileParallelism: false,
    environment: 'node',
    include: ['tests/packaging/**/*.test.ts'],
    testTimeout: 180_000,
  },
});
