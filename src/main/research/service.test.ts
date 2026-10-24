import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, vi } from 'vitest';
import { loadedRelease } from '../../../tests/discogsFixtures';
import { createCatalogueStore } from '../catalogue/store';
import { createResearchService } from './service';

test('builds a researched crate from verified releases, picked tracks and source evidence', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-research-service-'));
  const catalogue = createCatalogueStore(join(directory, 'catalog.sqlite'));
  const changed = vi.fn();
  const loadRelease = vi.fn().mockResolvedValue({ ok: true, value: loadedRelease });
  const service = createResearchService(
    catalogue,
    { loadRelease, researchSearch: vi.fn() },
    changed,
  );
  try {
    const created = await service.execute({
      name: 'create_crate',
      arguments: { name: 'H-Foundation picks' },
    });
    expect(created.ok).toBe(true);
    const view = await catalogue.view();
    if (!view.ok) throw new Error('No catalogue');
    const crateId = view.value.crates.find((crate) => crate.name === 'H-Foundation picks')?.id;
    if (!crateId) throw new Error('No research crate');
    expect(
      await service.execute({ name: 'add_release', arguments: { crateId, releaseId: 12 } }),
    ).toMatchObject({ ok: true });
    expect(loadRelease).toHaveBeenCalledWith(12);
    const added = await catalogue.view(crateId);
    if (!added.ok || !added.value.entries[0]?.tracks[0]) throw new Error('No track');
    const trackKey = added.value.entries[0].tracks[0].key;
    expect(
      await service.execute({
        name: 'annotate_track',
        arguments: { crateId, releaseId: 12, trackKey, picked: true, tags: ['dub'] },
      }),
    ).toMatchObject({ ok: true });
    expect(
      await service.execute({
        name: 'save_research',
        arguments: {
          crateId,
          releaseId: 12,
          trackKey,
          title: 'Quiet Orbit',
          mixUrl: 'https://youtu.be/mixfixture1',
          certainty: 'confirmed',
          timestamp: '00:31:20',
        },
      }),
    ).toMatchObject({ ok: true });
    expect(await service.execute({ name: 'get_crate', arguments: { crateId } })).toMatchObject({
      ok: true,
      value: {
        entries: [{ tracks: [{ picked: true, tags: ['dub'] }] }],
        research: [{ certainty: 'confirmed', timestamp: '00:31:20' }],
      },
    });
    expect(changed).toHaveBeenCalledTimes(4);
  } finally {
    await catalogue.close();
    await rm(directory, { recursive: true, force: true });
  }
});
