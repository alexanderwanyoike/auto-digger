import { z } from 'zod';
import { releaseSchema } from '../../shared/discogs';
import type { CrateResult } from '../../shared/crate';
import { crateFailure } from '../../shared/crateFailure';
import type { createCatalogueStore } from './store';
import type { CatalogueViewResult } from '../../shared/catalogue';

function releases(result: CatalogueViewResult): CrateResult {
  return result.ok
    ? { ok: true, value: result.value.entries.map((entry) => entry.release) }
    : result;
}

export function createLegacyCrateStore(catalogue: ReturnType<typeof createCatalogueStore>) {
  return {
    async list(): Promise<CrateResult> {
      return releases(await catalogue.view());
    },
    async save(input: unknown): Promise<CrateResult> {
      const release = releaseSchema.safeParse(input);
      if (!release.success)
        return crateFailure('invalid-input', 'Choose a complete Discogs release.');
      let view = await catalogue.view();
      if (!view.ok) return view;
      if (!view.value.crateId) view = await catalogue.create('My crate');
      if (!view.ok) return view;
      if (!view.value.crateId) return crateFailure('storage', 'A crate could not be created.');
      return releases(await catalogue.add({ crateId: view.value.crateId, release: release.data }));
    },
    async remove(input: unknown): Promise<CrateResult> {
      const id = z.number().int().positive().safeParse(input);
      if (!id.success) return crateFailure('invalid-input', 'Choose a saved release to remove.');
      const view = await catalogue.view();
      if (!view.ok || !view.value.crateId) return releases(view);
      return releases(await catalogue.remove({ crateId: view.value.crateId, releaseId: id.data }));
    },
  };
}
