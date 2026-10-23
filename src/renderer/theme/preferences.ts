import type { Result } from '../../shared/result';

export type Appearance = 'light' | 'dark' | 'system';
export type PreferenceError = 'storage-unavailable';
const storageKey = 'auto-digger.appearance';

export function readAppearance(): Result<Appearance, PreferenceError> {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return { ok: true, value: saved === 'light' || saved === 'dark' ? saved : 'system' };
  } catch {
    return { ok: false, error: 'storage-unavailable' };
  }
}

export function saveAppearance(appearance: Appearance): Result<undefined, PreferenceError> {
  try {
    window.localStorage.setItem(storageKey, appearance);
    return { ok: true, value: undefined };
  } catch {
    return { ok: false, error: 'storage-unavailable' };
  }
}
