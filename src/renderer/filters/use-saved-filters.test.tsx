import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { emptyFilters } from '../../shared/default-filters';
import type { SavedFiltersBridge } from '../../shared/saved-filters';
import { useSavedFilters } from './use-saved-filters';

test('preserves a draft when saving fails and retries it without restoring older filters', async () => {
  const snapshot = { draft: emptyFilters, presets: [] };
  let persistedYear = emptyFilters.year;
  const bridge: SavedFiltersBridge = {
    read: vi.fn().mockResolvedValue({ ok: true, value: snapshot }),
    saveDraft: vi
      .fn<SavedFiltersBridge['saveDraft']>()
      .mockResolvedValueOnce({
        ok: false,
        error: { code: 'storage', message: 'Could not save filters.' },
      })
      .mockImplementation((draft) => {
        if (draft.year === '1998-')
          return Promise.resolve({
            ok: false,
            error: { code: 'invalid-input', message: 'Use a complete year.' },
          });
        persistedYear = draft.year;
        return Promise.resolve({ ok: true, value: { ...snapshot, draft } });
      }),
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
  expect(persistedYear).toBe('1998');
  expect(result.current.error).toBeNull();
});

test('persists a quick revert after an earlier draft save finishes', async () => {
  const original = { ...emptyFilters, year: '1998' };
  const snapshot = { draft: original, presets: [] };
  let finishEarlierSave: () => void = () => {
    throw new Error('No pending save');
  };
  const pending = new Promise<void>((resolve) => {
    finishEarlierSave = resolve;
  });
  let persistedYear = original.year;
  const bridge: SavedFiltersBridge = {
    read: vi.fn().mockResolvedValue({ ok: true, value: snapshot }),
    saveDraft: vi.fn<SavedFiltersBridge['saveDraft']>().mockImplementation(async (draft) => {
      if (draft.year === '2001') await pending;
      persistedYear = draft.year;
      return { ok: true, value: { ...snapshot, draft } };
    }),
    savePreset: vi.fn(),
    removePreset: vi.fn(),
  };
  const { result } = renderHook(() => useSavedFilters(bridge));
  await waitFor(() => {
    expect(result.current.ready).toBe(true);
  });
  act(() => {
    result.current.setDraft({ ...original, year: '2001' });
  });
  await waitFor(() => {
    expect(bridge.saveDraft).toHaveBeenCalledTimes(1);
  });
  act(() => {
    result.current.setDraft(original);
  });
  await act(async () => {
    finishEarlierSave();
    await pending;
  });
  await waitFor(() => {
    expect(persistedYear).toBe('1998');
  });
  expect(result.current.draft).toEqual(original);
});
