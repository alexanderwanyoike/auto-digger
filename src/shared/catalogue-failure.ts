import type { CrateError } from './crate';
import type { CatalogueResult } from './catalogue';

export function catalogueFailure<T>(code: CrateError['code'], message: string): CatalogueResult<T> {
  return { ok: false, error: { code, message } };
}
