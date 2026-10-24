import type { AudioError, AudioResult } from './audio';

export function audioFailure<T>(code: AudioError['code'], message: string): AudioResult<T> {
  return { ok: false, error: { code, message } };
}
