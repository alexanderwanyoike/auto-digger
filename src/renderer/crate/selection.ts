import type { Result } from '../../shared/result';
import type { CrateError } from '../../shared/crate';

const storageKey = 'auto-digger.active-crate';

export function readCrateSelection(): Result<string | undefined, CrateError> {
  try {
    const saved = window.localStorage.getItem(storageKey)?.trim();
    return { ok: true, value: saved && saved.length <= 100 ? saved : undefined };
  } catch {
    return {
      ok: false,
      error: {
        code: 'storage',
        message: 'Crates are saved, but the active crate could not be restored on this device.',
      },
    };
  }
}

export function saveCrateSelection(id: string | null): Result<undefined, CrateError> {
  try {
    if (id === null) window.localStorage.removeItem(storageKey);
    else window.localStorage.setItem(storageKey, id);
    return { ok: true, value: undefined };
  } catch {
    return {
      ok: false,
      error: {
        code: 'storage',
        message: 'Crates are saved, but the active crate could not be remembered on this device.',
      },
    };
  }
}
