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
    expect(loadRelease).toHaveBeenCalledWith(12, undefined);
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

test('rejects invented snapshots, mismatched IDs and writes from a revoked lookup', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-research-boundary-'));
  const catalogue = createCatalogueStore(join(directory, 'catalog.sqlite'));
  const loadRelease = vi
    .fn<() => Promise<import('../../shared/discogs').DiscogsResult<typeof loadedRelease>>>()
    .mockResolvedValue({ ok: true, value: { ...loadedRelease, id: 999 } });
  const changed = vi.fn();
  const service = createResearchService(
    catalogue,
    { loadRelease, researchSearch: vi.fn() },
    changed,
  );
  try {
    const created = await catalogue.create('Research boundary');
    if (!created.ok || !created.value.crateId) throw new Error('No crate');
    const { crateId } = created.value;
    expect(await service.execute({ name: 'delete_everything', arguments: {} })).toMatchObject({
      ok: false,
      error: { code: 'invalid-input' },
    });
    expect(
      await service.execute({
        name: 'add_release',
        arguments: { crateId, releaseId: 12, release: loadedRelease },
      }),
    ).toMatchObject({ ok: false, error: { code: 'invalid-input' } });
    expect(loadRelease).not.toHaveBeenCalled();
    expect(
      await service.execute({ name: 'add_release', arguments: { crateId, releaseId: 12 } }),
    ).toMatchObject({ ok: false, error: { code: 'invalid-data' } });
    let finish: (
      result: import('../../shared/discogs').DiscogsResult<typeof loadedRelease>,
    ) => void = () => {
      throw new Error('Lookup has not started');
    };
    loadRelease.mockImplementationOnce(
      () =>
        new Promise((resolveLookup) => {
          finish = resolveLookup;
        }),
    );
    const controller = new AbortController();
    const pending = service.execute(
      { name: 'add_release', arguments: { crateId, releaseId: 12 } },
      controller.signal,
    );
    controller.abort();
    finish({ ok: true, value: loadedRelease });
    expect(await pending).toMatchObject({ ok: false, error: { code: 'unavailable' } });
    expect(await catalogue.view(crateId)).toMatchObject({ ok: true, value: { entries: [] } });
    expect(changed).not.toHaveBeenCalled();
  } finally {
    await catalogue.close();
    await rm(directory, { recursive: true, force: true });
  }
});
