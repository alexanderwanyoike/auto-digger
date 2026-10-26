import { expect, test, vi } from 'vitest';
import { createCrateBridge } from './crate-bridge';
import { loadedRelease } from '../../tests/discogs-fixtures';

test('validates crate results at the isolated desktop boundary', async () => {
  const invoke = vi
    .fn<(channel: string, input?: unknown) => Promise<unknown>>()
    .mockResolvedValueOnce({ ok: true, value: [loadedRelease] })
    .mockResolvedValueOnce({ ok: true, value: [{ id: 12 }] })
    .mockRejectedValueOnce(new Error('private details'));
  const bridge = createCrateBridge(invoke);
  expect(await bridge.list()).toEqual({ ok: true, value: [loadedRelease] });
  expect(await bridge.save(loadedRelease)).toMatchObject({
    ok: false,
    error: { code: 'invalid-data' },
  });
  expect(await bridge.remove(12)).toMatchObject({ ok: false, error: { code: 'unavailable' } });
  expect(invoke.mock.calls[0]).toEqual(['crate:list', undefined]);
});
