import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import type { CatalogueBridge, CatalogueView } from '../../shared/catalogue';
import { loadedRelease } from '../../../tests/discogs-fixtures';
import { useCrate } from '../crate/use-crate';
import { CratesPage } from './CratesPage';

test('keeps saved record selection disabled during an unfinished Discogs request', async () => {
  const view: CatalogueView = {
    crateId: 'default',
    crates: [{ id: 'default', name: 'My crate', releaseCount: 1 }],
    entries: [{ release: loadedRelease, tracks: [] }],
  };
  const respond = () => Promise.resolve({ ok: true as const, value: view });
  const bridge: CatalogueBridge = {
    view: respond,
    create: respond,
    rename: respond,
    deleteCrate: respond,
    add: respond,
    remove: respond,
    annotate: respond,
  };
  function Harness() {
    const crate = useCrate(undefined, bridge);
    return <CratesPage crate={crate} disabled onOpen={() => undefined} />;
  }
  render(<Harness />);
  expect(await screen.findByRole('button', { name: 'Open Quiet Orbit EP' })).toBeDisabled();
});
