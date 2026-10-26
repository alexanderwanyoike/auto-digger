import { z } from 'zod';
import { catalogueChannels, catalogueViewSchema } from '../shared/catalogue';
import type { CatalogueBridge, CatalogueViewResult } from '../shared/catalogue';
import { crateErrorSchema } from '../shared/crate';
import { catalogueFailure } from '../shared/catalogue-failure';

export function createCatalogueBridge(
  invoke: (channel: string, input?: unknown) => Promise<unknown>,
): CatalogueBridge {
  async function call(channel: string, input?: unknown): Promise<CatalogueViewResult> {
    try {
      const response = z
        .discriminatedUnion('ok', [
          z.object({ ok: z.literal(true), value: catalogueViewSchema }),
          z.object({ ok: z.literal(false), error: crateErrorSchema }),
        ])
        .safeParse(await invoke(channel, input));
      if (response.success) return response.data;
    } catch {
      /* The boundary never exposes internal storage errors. */
    }
    return catalogueFailure(
      'unavailable',
      'Your crates could not be reached. Please retry or restart Auto Digger.',
    );
  }
  return {
    view: (id) => call(catalogueChannels.view, id),
    create: (name) => call(catalogueChannels.create, name),
    rename: (input) => call(catalogueChannels.rename, input),
    deleteCrate: (id) => call(catalogueChannels.deleteCrate, id),
    add: (input) => call(catalogueChannels.add, input),
    remove: (input) => call(catalogueChannels.remove, input),
    annotate: (input) => call(catalogueChannels.annotate, input),
  };
}
