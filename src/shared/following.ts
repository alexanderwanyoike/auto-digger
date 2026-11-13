import { z } from 'zod';
import type { CatalogueResult } from './catalogue';

export const followTopicSchema = z.object({
  kind: z.enum(['artist', 'label', 'genre']),
  name: z.string().trim().min(1).max(160),
});
export const followingSchema = z.array(followTopicSchema);
export const followChangeSchema = z.object({ topic: followTopicSchema, followed: z.boolean() });
export type FollowTopic = z.infer<typeof followTopicSchema>;
export type FollowingResult = CatalogueResult<FollowTopic[]>;

export function followTopicKey({ kind, name }: FollowTopic) {
  return `${kind}:${name.trim().normalize('NFC').toLowerCase()}`;
}

export interface FollowingBridge {
  read: () => Promise<FollowingResult>;
  setFollowed: (input: z.infer<typeof followChangeSchema>) => Promise<FollowingResult>;
}
