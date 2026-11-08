import type { DatabaseSync } from 'node:sqlite';
import { catalogueFailure } from '../../shared/catalogue-failure';
import type { CatalogueResult } from '../../shared/catalogue';
import { followChangeSchema, followingSchema, followTopicKey } from '../../shared/following';
import type { FollowingResult } from '../../shared/following';

export function createFollowingStore(connection: () => Promise<CatalogueResult<DatabaseSync>>) {
  async function readFollowing(
    update?: (database: DatabaseSync) => void,
  ): Promise<FollowingResult> {
    const result = await connection();
    if (!result.ok) return result;
    try {
      const database = result.value;
      update?.(database);
      const rows = database
        .prepare('SELECT kind, name FROM follows ORDER BY name COLLATE NOCASE, id')
        .all();
      const parsed = followingSchema.safeParse(rows);
      return parsed.success
        ? { ok: true, value: parsed.data }
        : catalogueFailure('invalid-data', 'The following list could not be read.');
    } catch {
      return catalogueFailure(
        'storage',
        'Your following list could not be saved or read. Please retry.',
      );
    }
  }

  return {
    read: () => readFollowing(),
    setFollowed(input: unknown): Promise<FollowingResult> {
      const parsed = followChangeSchema.safeParse(input);
      if (!parsed.success)
        return Promise.resolve(
          catalogueFailure('invalid-input', 'Choose a valid artist, label or genre.'),
        );
      const { topic, followed } = parsed.data;
      const id = followTopicKey(topic);
      return readFollowing((database) => {
        if (followed)
          database
            .prepare(
              'INSERT INTO follows(id, kind, name) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING',
            )
            .run(id, topic.kind, topic.name);
        else database.prepare('DELETE FROM follows WHERE id = ?').run(id);
      });
    },
  };
}
