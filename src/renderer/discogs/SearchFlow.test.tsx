import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { DiscogsBridge } from '../../shared/discogs';
import { identityResponse, loadedRelease } from '../../../tests/discogsFixtures';
import { App } from '../App';

test('applies filters, browses another page and opens a matching release', async () => {
  const search = vi.fn().mockResolvedValue({
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
  const dig = vi.fn().mockResolvedValue({
    ok: true,
    value: { release: loadedRelease, seen: 1, total: 51, limited: false },
  });
  const bridge: DiscogsBridge = {
    dig,
    account: () => Promise.resolve({ ok: true, value: identityResponse }),
    connect: () => Promise.resolve({ ok: true, value: identityResponse }),
    loadRelease: vi
      .fn<DiscogsBridge['loadRelease']>()
      .mockResolvedValue({ ok: true, value: loadedRelease }),
    disconnect: () => Promise.resolve({ ok: true, value: undefined }),
    openSettings: () => Promise.resolve({ ok: true, value: undefined }),
    search,
  };
  const user = userEvent.setup();
  render(<App discogs={bridge} />);
  await screen.findByRole('button', { name: 'Connected as quiet-digger' });
  await user.click(screen.getByLabelText('Genre'));
  await user.click(screen.getByRole('option', { name: 'Electronic' }));
  await user.click(screen.getByRole('option', { name: 'Jazz' }));
  await user.type(screen.getByLabelText('Style'), 'Deep House');
  await user.click(screen.getByRole('option', { name: 'Deep House' }));
  await user.type(screen.getByLabelText('Style'), 'Techno');
  await user.click(screen.getByRole('option', { name: 'Techno' }));
  await user.click(screen.getByRole('button', { name: 'Search EPs' }));
  expect(await screen.findByText('51 matching releases')).toBeInTheDocument();
  expect(search).toHaveBeenLastCalledWith({
    filters: {
      label: '',
      artist: '',
      year: '',
      genre: ['Electronic', 'Jazz'],
      style: ['Deep House', 'Techno'],
      title: '',
    },
    page: 1,
  });
  await user.click(screen.getByRole('button', { name: 'Next page' }));
  expect(search).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
  await user.click(screen.getByRole('button', { name: /Low Tide - Quiet Orbit EP/ }));
  expect(await screen.findByRole('heading', { name: 'Quiet Orbit EP' })).toBeInTheDocument();
  expect(bridge.loadRelease).toHaveBeenCalledWith(12);
  expect(
    screen.queryByRole('button', { name: /Low Tide - Quiet Orbit EP/ }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Back to matches' }));
  expect(screen.getByRole('button', { name: /Low Tide - Quiet Orbit EP/ })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Dig a random EP' }));
  expect(await screen.findByText('1 found · 51 accessible matches')).toBeInTheDocument();
  await user.type(screen.getByLabelText('Style'), ' draft');
  await user.click(screen.getByRole('button', { name: 'Dig again' }));
  expect(dig).toHaveBeenLastCalledWith({
    filters: {
      label: '',
      artist: '',
      year: '',
      genre: ['Electronic', 'Jazz'],
      style: ['Deep House', 'Techno'],
      title: '',
    },
    reset: false,
  });
});
