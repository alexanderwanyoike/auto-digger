import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { createCatalogueStore } from '../catalogue/store';

const filters = { label: 'Still Records', artist: '', year: '1990-1999', title: '',
  genre: ['Electronic'], style: ['Deep House'], format: ['Album', 'EP'] };

test('keeps named filters and the current draft after closing and reopening the catalogue', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-filters-'));
  const file = join(directory, 'catalog.sqlite');
  const store = createCatalogueStore(file);
  try {
    const saved = await store.filters.savePreset({ name: 'Nineties house', filters });
    expect(saved).toMatchObject({ ok: true, value: { presets: [{ name: 'Nineties house', filters }] } });
    if (!saved.ok) throw new Error('The preset was not saved');
    const id = saved.value.presets[0]?.id;
    expect(await store.filters.saveDraft({ ...filters, year: '1998' }))
      .toMatchObject({ ok: true, value: { draft: { year: '1998' } } });
    expect(await store.filters.savePreset({ id, name: 'Nineties house', filters: { ...filters, year: '1995-1999' } }))
      .toMatchObject({ ok: true, value: { presets: [{ id, filters: { year: '1995-1999' } }] } });
    expect(await store.filters.saveDraft({ ...filters, year: '1999-1990' }))
      .toMatchObject({ ok: false, error: { code: 'invalid-input' } });
    await store.close();
    const reopened = createCatalogueStore(file);
    try {
      expect(await reopened.filters.read()).toMatchObject({ ok: true, value: {
        draft: { year: '1998' }, presets: [{ id, filters: { year: '1995-1999' } }],
      } });
      expect(await reopened.filters.removePreset(id)).toMatchObject({ ok: true, value: { presets: [] } });
      expect(await reopened.view()).toMatchObject({ ok: true, value: { crates: [{ name: 'My crate' }] } });
    } finally { await reopened.close(); }
  } finally { await store.close(); await rm(directory, { recursive: true, force: true }); }
});
