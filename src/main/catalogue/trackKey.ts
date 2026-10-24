import { createHash } from 'node:crypto';
import type { DiscogsRelease } from '../../shared/discogs';

export function trackKey(track: DiscogsRelease['tracks'][number]): string {
  return createHash('sha256')
    .update(JSON.stringify([track.position, track.title]))
    .digest('hex');
}
