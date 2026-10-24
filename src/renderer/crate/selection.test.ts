import { expect, test, vi } from 'vitest';
import { readCrateSelection, saveCrateSelection } from './selection';

test('remembers and clears the active crate without changing other preferences', () => {
  window.localStorage.setItem('auto-digger.appearance', 'dark');
  expect(saveCrateSelection('night-picks')).toEqual({ ok: true, value: undefined });
  expect(readCrateSelection()).toEqual({ ok: true, value: 'night-picks' });
  expect(saveCrateSelection(null)).toEqual({ ok: true, value: undefined });
  expect(readCrateSelection()).toEqual({ ok: true, value: undefined });
  expect(window.localStorage.getItem('auto-digger.appearance')).toBe('dark');
});

test('reports unavailable preference storage as explicit errors', () => {
  const blocked = () => {
    throw new Error('Preference storage is blocked');
  };
  const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked);
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked);
  const remove = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(blocked);
  try {
    expect(readCrateSelection()).toMatchObject({ ok: false, error: { code: 'storage' } });
    expect(saveCrateSelection('night-picks')).toMatchObject({
      ok: false,
      error: { code: 'storage' },
    });
    expect(saveCrateSelection(null)).toMatchObject({ ok: false, error: { code: 'storage' } });
  } finally {
    read.mockRestore();
    write.mockRestore();
    remove.mockRestore();
  }
});
