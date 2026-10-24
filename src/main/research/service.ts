import { catalogueFailure } from '../../shared/catalogueFailure';
import { researchCommandSchema } from '../../shared/researchCommands';
import type { ResearchResult } from '../../shared/researchCommands';
import type { createCatalogueStore } from '../catalogue/store';
import type { createRememberedSession } from '../discogs/rememberedSession';

type DiscogsResearch = Pick<
  ReturnType<typeof createRememberedSession>,
  'loadRelease' | 'researchSearch'
>;
export function createResearchService(
  catalogue: ReturnType<typeof createCatalogueStore>,
  discogs: DiscogsResearch,
  onChange: () => void,
) {
  async function execute(input: unknown, signal?: AbortSignal): Promise<ResearchResult> {
    const parsed = researchCommandSchema.safeParse(input);
    if (!parsed.success)
      return catalogueFailure(
        'invalid-input',
        'Choose a supported research tool and valid arguments.',
      );
    if (signal?.aborted) return catalogueFailure('unavailable', 'Research access has stopped.');
    const command = parsed.data;
    switch (command.name) {
      case 'list_crates': {
        const view = await catalogue.view();
        return view.ok ? { ok: true, value: view.value.crates } : view;
      }
      case 'get_crate':
        return catalogue.view(command.arguments.crateId);
      case 'create_crate':
        return catalogue.create(command.arguments.name);
      case 'search_releases':
        return discogs.researchSearch(command.arguments);
      case 'get_release': {
        const result = await discogs.loadRelease(command.arguments.releaseId);
        if (result.ok && result.value.id !== command.arguments.releaseId)
          return catalogueFailure(
            'invalid-data',
            'Discogs returned a different release. Please verify the release ID.',
          );
        return result;
      }
      case 'add_release': {
        const result = await discogs.loadRelease(command.arguments.releaseId);
        if (!result.ok) return result;
        if (signal?.aborted)
          return catalogueFailure(
            'unavailable',
            'Research access has stopped. No release was added.',
          );
        if (result.value.id !== command.arguments.releaseId)
          return catalogueFailure(
            'invalid-data',
            'Discogs returned a different release. No release was added.',
          );
        return catalogue.add({ crateId: command.arguments.crateId, release: result.value });
      }
      case 'annotate_track':
        return catalogue.annotate(command.arguments);
      case 'save_research':
        return catalogue.research.save(command.arguments);
      default:
        return catalogueFailure('invalid-input', 'Choose a supported research tool.');
    }
  }
  return {
    async execute(input: unknown, signal?: AbortSignal): Promise<ResearchResult> {
      try {
        const result = await execute(input, signal);
        const parsed = researchCommandSchema.safeParse(input);
        if (
          result.ok &&
          parsed.success &&
          ['create_crate', 'add_release', 'annotate_track', 'save_research'].includes(
            parsed.data.name,
          )
        )
          onChange();
        return result;
      } catch {
        return catalogueFailure(
          'unavailable',
          'Research could not finish. Please retry in Auto Digger.',
        );
      }
    },
  };
}
