import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { DiscogsBridge } from '../../shared/discogs';
import { identityResponse, loadedRelease } from '../../../tests/discogs-fixtures';
import { App } from '../App';

test('browses an artist without old filters and restores the EP and original search on return', async () => {
  const original = {
    label: 'Still Records',
    artist: '',
    year: '1998',
    genre: [],
    style: [],
    format: [],
    title: '',
  };
  const search = vi
    .fn<DiscogsBridge['search']>()
    .mockResolvedValue({
      ok: true,
      value: {
        page: 1,
        pages: 1,
        perPage: 50,
        items: 1,
        releases: [
          {
            id: 12,
            title: 'Low Tide - Quiet Orbit EP',
            year: '1998',
            labels: [],
            formats: [],
            artworkUrl: null,
          },
        ],
      },
    });
  const bridge: DiscogsBridge = {
    account: () => Promise.resolve({ ok: true, value: identityResponse }),
    search,
    loadRelease: () => Promise.resolve({ ok: true, value: loadedRelease }),
    connect: vi.fn(),
    dig: vi.fn(),
    disconnect: vi.fn(),
    openSettings: vi.fn(),
  };
  const user = userEvent.setup();
  render(<App discogs={bridge} />);
  await screen.findByRole('button', { name: 'Connected as quiet-digger' });
  await user.type(screen.getByLabelText('Label'), 'Still Records');
  await user.type(screen.getByLabelText('Year'), '1998');
  await user.click(screen.getByRole('button', { name: 'Search releases' }));
  await user.click(await screen.findByRole('button', { name: /Low Tide - Quiet Orbit EP/ }));
  await user.click(await screen.findByRole('button', { name: 'Browse releases by Low Tide' }));
  expect(search).toHaveBeenLastCalledWith({
    filters: {
      label: '',
      artist: 'Low Tide',
      year: '',
      genre: [],
      style: [],
      format: [],
      title: '',
    },
    page: 1,
  });
  expect(await screen.findByText('Artist search · Low Tide')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Back to Quiet Orbit EP' }));
  expect(await screen.findByRole('heading', { name: 'Quiet Orbit EP' })).toBeVisible();
  expect(screen.getByLabelText('Label')).toHaveValue('Still Records');
  expect(screen.getByLabelText('Year')).toHaveValue('1998');
  await user.click(screen.getByRole('button', { name: 'Back to matches' }));
  expect(await screen.findByRole('button', { name: /Low Tide - Quiet Orbit EP/ })).toBeVisible();
  expect(search).toHaveBeenNthCalledWith(1, { filters: original, page: 1 });
});
