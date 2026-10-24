import { z } from 'zod';
import { releaseSchema } from '../../shared/discogs';
import type { CrateResult } from '../../shared/crate';
import type { DiscogsRelease } from '../../shared/discogs';
import { crateFailure } from '../../shared/crateFailure';
import { isEp } from '../../shared/isEp';
import { readCrate, writeCrate } from './file';

export function createCrateStore(file: string) {
  async function mutate(
    change: (releases: DiscogsRelease[]) => DiscogsRelease[],
  ): Promise<CrateResult> {
    const loaded = await readCrate(file);
    if (!loaded.ok) return loaded;
    return writeCrate(file, change(loaded.value));
  }
  return {
    list: () => readCrate(file),
    save: (input: unknown): Promise<CrateResult> => {
      const parsed = releaseSchema.safeParse(input);
      if (!parsed.success || !isEp(parsed.data.formats))
        return Promise.resolve(
          crateFailure('invalid-input', 'Only a complete EP release can be saved to the crate.'),
        );
      const release = parsed.data;
      return mutate((releases) =>
        releases.some((item) => item.id === release.id) ? releases : [...releases, release],
      );
    },
    remove: (input: unknown): Promise<CrateResult> => {
      const parsed = z.number().int().positive().safeParse(input);
      if (!parsed.success)
        return Promise.resolve(crateFailure('invalid-input', 'Choose a saved record to remove.'));
      return mutate((releases) => releases.filter((release) => release.id !== parsed.data));
    },
  };
}
