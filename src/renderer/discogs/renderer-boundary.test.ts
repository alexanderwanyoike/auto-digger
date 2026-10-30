import { expect, test, vi } from 'vitest';

vi.mock('../../shared/search', () => {
  throw new Error('ADR 0002: runtime search schemas belong to main/preload, not renderer');
});

test('loads Discogs navigation without importing runtime search validation into the renderer', async () => {
  const { useDiscogs } = await import('./use-discogs');
  expect(useDiscogs).toBeTypeOf('function');
});
