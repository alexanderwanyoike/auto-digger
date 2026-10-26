import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import type { CatalogueBridge, CatalogueView } from '../../shared/catalogue';
import { useCatalogue } from './use-catalogue';

test('keeps a restore warning and the unreadable preference until a crate is explicitly selected', async () => {
  const key = 'auto-digger.active-crate';
  window.localStorage.setItem(key, 'previous-crate');
  const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('Preference read is blocked');
  });
  const view: CatalogueView = {
    crateId: 'default',
    crates: [{ id: 'default', name: 'My crate', releaseCount: 0 }],
    entries: [],
  };
  const respond = () => Promise.resolve({ ok: true as const, value: view });
  const bridge: CatalogueBridge = {
    view: respond,
    create: respond,
    rename: respond,
    deleteCrate: respond,
    add: respond,
    remove: respond,
    annotate: respond,
  };
  try {
    const { result } = renderHook(() => useCatalogue(bridge));
    await waitFor(() => {
      expect(result.current.ready).toBe(true);
    });
    expect(result.current.view).toEqual(view);
    expect(result.current.error?.message).toContain('could not be restored');
    read.mockRestore();
    expect(window.localStorage.getItem(key)).toBe('previous-crate');
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.error?.message).toContain('could not be restored');
    expect(window.localStorage.getItem(key)).toBe('previous-crate');
    await act(async () => {
      await result.current.perform((api) => api.view('default'));
    });
    expect(result.current.error).toBeNull();
    expect(window.localStorage.getItem(key)).toBe('default');
  } finally {
    read.mockRestore();
  }
});
