import { z } from 'zod';
import { followingSchema } from '../shared/following';
import type { FollowingBridge, FollowingResult } from '../shared/following';
import { crateErrorSchema } from '../shared/crate';
import { catalogueFailure } from '../shared/catalogue-failure';

const responseSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), value: followingSchema }),
  z.object({ ok: z.literal(false), error: crateErrorSchema }),
]);

export function createFollowingBridge(
  invoke: (channel: string, input?: unknown) => Promise<unknown>,
): FollowingBridge {
  async function call(channel: string, input?: unknown): Promise<FollowingResult> {
    try {
      const response = responseSchema.safeParse(await invoke(channel, input));
      if (response.success) return response.data;
    } catch {
      return catalogueFailure(
        'unavailable',
        'Your following list could not be reached. Please retry.',
      );
    }
    return catalogueFailure('invalid-data', 'Your following list could not be read.');
  }
  return {
    read: () => call('following:read'),
    setFollowed: (input) => call('following:set', input),
  };
}
