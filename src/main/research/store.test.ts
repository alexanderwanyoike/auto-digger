import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { createCatalogueStore } from '../catalogue/store';
import { loadedRelease } from '../../../tests/discogs-fixtures';

test('persists mix provenance and uncertain candidates beside picked tracks in a named crate', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-research-'));
  const file = join(directory, 'catalog.sqlite');
  const catalogue = createCatalogueStore(file);
  try {
    const created = await catalogue.create('H-Foundation picks');
    if (!created.ok || !created.value.crateId) throw new Error('No crate');
    const { crateId } = created.value;
    const added = await catalogue.add({ crateId, release: loadedRelease });
    if (!added.ok || !added.value.entries[0]?.tracks[0]) throw new Error('No track');
    const trackKey = added.value.entries[0].tracks[0].key;
    await catalogue.annotate({ crateId, releaseId: 12, trackKey, picked: true, tags: ['dub'] });
    const note = {
      crateId,
      releaseId: 12,
      trackKey,
      title: 'Quiet Orbit',
      artist: 'Low Tide',
      mixUrl: 'https://www.youtube.com/watch?v=mixfixture1',
      sourceUrls: ['https://www.discogs.com/release/12'],
      trackNumber: 3,
      timestamp: '00:31:20',
      certainty: 'confirmed',
      notes: 'Original EP; recording version checked.',
    };
    expect(await catalogue.research.save(note)).toMatchObject({
      ok: true,
      value: { certainty: 'confirmed', trackKey },
    });
    expect(
      await catalogue.research.save({
        ...note,
        releaseId: null,
        trackKey: null,
        title: 'Unidentified track',
        artist: '',
        trackNumber: 4,
        certainty: 'unresolved',
      }),
    ).toMatchObject({ ok: true });
    expect(await catalogue.research.save({ ...note, trackKey: '0'.repeat(64) })).toMatchObject({
      ok: false,
      error: { code: 'invalid-input' },
    });
    expect(await catalogue.research.save({ ...note, mixUrl: 'file:///etc/passwd' })).toMatchObject({
      ok: false,
    });
    await catalogue.close();
    const reopened = createCatalogueStore(file);
    try {
      expect(await reopened.view(crateId)).toMatchObject({
        ok: true,
        value: {
          entries: [{ tracks: [{ picked: true, tags: ['dub'] }] }],
          research: [{ certainty: 'confirmed' }, { certainty: 'unresolved' }],
        },
      });
      await reopened.deleteCrate(crateId);
      expect(await reopened.research.list(crateId)).toMatchObject({
        ok: false,
        error: { code: 'invalid-input' },
      });
    } finally {
      await reopened.close();
    }
  } finally {
    await catalogue.close();
    await rm(directory, { recursive: true, force: true });
  }
});
