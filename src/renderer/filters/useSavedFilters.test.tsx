import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { emptyFilters } from '../../shared/savedFilters';
import type { SavedFiltersBridge } from '../../shared/savedFilters';
import { useSavedFilters } from './useSavedFilters';

test('preserves a draft when saving fails and retries it without restoring older filters', async () => {
  const snapshot = { draft: emptyFilters, presets: [] };
  const bridge: SavedFiltersBridge = {
    read: vi.fn().mockResolvedValue({ ok: true, value: snapshot }),
    saveDraft: vi
      .fn<SavedFiltersBridge['saveDraft']>()
      .mockResolvedValueOnce({
        ok: false,
        error: { code: 'storage', message: 'Could not save filters.' },
      })
      .mockImplementation((draft) => Promise.resolve({ ok: true, value: { ...snapshot, draft } })),
    savePreset: vi.fn(),
    removePreset: vi.fn(),
  };
  const { result } = renderHook(() => useSavedFilters(bridge));
  await waitFor(() => {
    expect(result.current.ready).toBe(true);
  });
  act(() => {
    result.current.setDraft({ ...emptyFilters, year: '1998' });
  });
  await waitFor(() => {
    expect(result.current.error).toBe('Could not save filters.');
  });
  await act(async () => result.current.reload());
  await waitFor(() => {
    expect(bridge.saveDraft).toHaveBeenCalledTimes(2);
  });
  expect(result.current.draft.year).toBe('1998');
  expect(result.current.error).toBeNull();
  act(() => {
    result.current.setDraft({ ...emptyFilters, year: '1998-' });
  });
  await act(async () => {
    await Promise.resolve();
  });
  expect(bridge.saveDraft).toHaveBeenCalledTimes(2);
});
