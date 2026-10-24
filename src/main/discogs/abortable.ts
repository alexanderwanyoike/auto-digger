import type { DiscogsResult } from '../../shared/discogs';
import { discogsFailure } from '../../shared/discogsFailure';

export function abortableDiscogs<T>(
  pending: Promise<DiscogsResult<T>>,
  signal?: AbortSignal,
): Promise<DiscogsResult<T>> {
  if (!signal) return pending;
  if (signal.aborted)
    return Promise.resolve(discogsFailure('cancelled', 'This Discogs request was cancelled.'));
  return new Promise((resolve) => {
    const cancel = () => {
      resolve(discogsFailure('cancelled', 'This Discogs request was cancelled.'));
    };
    signal.addEventListener('abort', cancel, { once: true });
    pending
      .then(resolve, () => {
        resolve(
          discogsFailure('unavailable', 'Discogs could not complete this request. Please retry.'),
        );
      })
      .finally(() => {
        signal.removeEventListener('abort', cancel);
      })
      .catch(() => undefined);
  });
}
