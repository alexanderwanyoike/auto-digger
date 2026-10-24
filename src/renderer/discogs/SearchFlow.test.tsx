import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { DiscogsBridge } from '../../shared/discogs';
import { identityResponse, loadedRelease } from '../../../tests/discogsFixtures';
import { App } from '../App';

test('applies filters, browses another page and opens a matching release', async () => {
  const search = vi
    .fn()
    .mockResolvedValue({
      ok: true,
      value: {
        page: 1,
        pages: 2,
        perPage: 50,
        items: 51,
        releases: [
          {
            id: 12,
            title: 'Low Tide - Quiet Orbit EP',
            year: '1998',
            labels: ['Still Records'],
            formats: ['EP'],
          },
        ],
      },
    });
  const bridge: DiscogsBridge = {
    account: async () => ({ ok: true, value: identityResponse }),
    connect: async () => ({ ok: true, value: identityResponse }),
    loadRelease: vi
      .fn<DiscogsBridge['loadRelease']>()
      .mockResolvedValue({ ok: true, value: loadedRelease }),
    disconnect: async () => ({ ok: true, value: undefined }),
    openSettings: async () => ({ ok: true, value: undefined }),
    search,
  };
  const user = userEvent.setup();
  render(<App discogs={bridge} />);
  await screen.findByRole('button', { name: 'Connected as quiet-digger' });
  await user.type(screen.getByLabelText('Style'), 'Deep House');
  await user.click(screen.getByRole('button', { name: 'Search EPs' }));
  expect(await screen.findByText('51 matching releases')).toBeInTheDocument();
  expect(search).toHaveBeenLastCalledWith({
    filters: { label: '', artist: '', year: '', genre: '', style: 'Deep House', title: '' },
    page: 1,
  });
  await user.click(screen.getByRole('button', { name: 'Next page' }));
  expect(search).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
  await user.click(screen.getByRole('button', { name: /Low Tide - Quiet Orbit EP/ }));
  expect(await screen.findByRole('heading', { name: 'Quiet Orbit EP' })).toBeInTheDocument();
  expect(bridge.loadRelease).toHaveBeenCalledWith(12);
});
