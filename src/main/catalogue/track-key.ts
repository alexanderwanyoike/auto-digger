import { createHash } from 'node:crypto';
import type { DiscogsRelease } from '../../shared/discogs';

export function trackKey(
  track: Pick<DiscogsRelease['tracks'][number], 'position' | 'title'>,
  occurrence = 0,
): string {
  return createHash('sha256')
    .update(
      JSON.stringify(
        occurrence ? [track.position, track.title, occurrence] : [track.position, track.title],
      ),
    )
    .digest('hex');
}
