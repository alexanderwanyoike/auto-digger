import type { CrateError, CrateResult } from './crate';

export function crateFailure(code: CrateError['code'], message: string): CrateResult {
  return { ok: false, error: { code, message } };
}
