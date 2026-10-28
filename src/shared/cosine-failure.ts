import type { CosineError, CosineResult } from './cosine';

export function cosineFailure<T>(code: CosineError['code'], message: string): CosineResult<T> {
  return { ok: false, error: { code, message } };
}
