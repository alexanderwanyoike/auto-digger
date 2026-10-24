import { createHash } from 'node:crypto';
import type { DiscogsRelease } from '../../shared/discogs';

export function trackKey(track: DiscogsRelease['tracks'][number], occurrence = 0): string {
  return createHash('sha256')
    .update(
      JSON.stringify(
        occurrence ? [track.position, track.title, occurrence] : [track.position, track.title],
      ),
    )
    .digest('hex');
}
