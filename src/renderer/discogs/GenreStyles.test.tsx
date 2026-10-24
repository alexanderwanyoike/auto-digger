import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { DiscogsBridge } from '../../shared/discogs';
import { identityResponse } from '../../../tests/discogsFixtures';
import { App } from '../App';

function renderDesk() {
  const search = vi.fn<DiscogsBridge['search']>().mockResolvedValue({
    ok: true,
    value: { page: 1, pages: 0, perPage: 50, items: 0, releases: [] },
  });
  const bridge: DiscogsBridge = {
    account: () => Promise.resolve({ ok: true, value: identityResponse }),
    connect: vi.fn(),
    disconnect: vi.fn(),
    loadRelease: vi.fn(),
    openSettings: vi.fn(),
    dig: vi.fn(),
    search,
  };
  render(<App discogs={bridge} />);
  return search;
}

test('offers Hip Hop styles without unrelated electronic options', async () => {
  renderDesk();
  const user = userEvent.setup();
  await screen.findByRole('button', { name: 'Connected as quiet-digger' });
  await user.type(screen.getByLabelText('Genre'), 'Hip Hop');
  await user.click(screen.getByRole('option', { name: 'Hip Hop' }));
  await user.keyboard('{Escape}');
  await user.type(screen.getByLabelText('Style'), 'Deep House');
  expect(screen.queryByRole('option', { name: 'Deep House' })).not.toBeInTheDocument();
  expect(screen.queryByRole('option', { name: 'Use "Deep House"' })).not.toBeInTheDocument();
  await user.clear(screen.getByLabelText('Style'));
  await user.type(screen.getByLabelText('Style'), 'Boom Bap');
  await user.click(screen.getByRole('option', { name: 'Boom Bap' }));
  await user.keyboard('{Escape}');
  expect(screen.getByLabelText('Remove Boom Bap')).toBeInTheDocument();
});

test('combines genres and removes stale styles while preserving compatible selections', async () => {
  const search = renderDesk();
  const user = userEvent.setup();
  await screen.findByRole('button', { name: 'Connected as quiet-digger' });
  await user.type(screen.getByLabelText('Genre'), 'Electronic');
  await user.click(screen.getByRole('option', { name: 'Electronic' }));
  await user.type(screen.getByLabelText('Style'), 'Deep House');
  await user.click(screen.getByRole('option', { name: 'Deep House' }));
  await user.type(screen.getByLabelText('Genre'), 'Hip Hop');
  await user.click(screen.getByRole('option', { name: 'Hip Hop' }));
  await user.type(screen.getByLabelText('Style'), 'Boom Bap');
  await user.click(screen.getByRole('option', { name: 'Boom Bap' }));
  await user.keyboard('{Escape}');
  expect(screen.getByLabelText('Remove Deep House')).toBeInTheDocument();
  await user.click(screen.getByLabelText('Remove Electronic'));
  expect(screen.queryByLabelText('Remove Deep House')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Remove Boom Bap')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Search releases' }));
  expect(search.mock.lastCall?.[0].filters.genre).toEqual(['Hip Hop']);
  expect(search.mock.lastCall?.[0].filters.style).toEqual(['Boom Bap']);
  await user.click(screen.getByLabelText('Remove Hip Hop'));
  expect(screen.getByLabelText('Remove Boom Bap')).toBeInTheDocument();
  await user.type(screen.getByLabelText('Style'), 'Deep House');
  expect(screen.getByRole('option', { name: 'Deep House' })).toBeInTheDocument();
});

test('allows explicit newer styles absent from the reference without guessing their genre', async () => {
  const search = renderDesk();
  const user = userEvent.setup();
  await screen.findByRole('button', { name: 'Connected as quiet-digger' });
  await user.type(screen.getByLabelText('Genre'), 'Hip Hop');
  await user.click(screen.getByRole('option', { name: 'Hip Hop' }));
  await user.type(screen.getByLabelText('Style'), 'Drill');
  await user.click(screen.getByRole('option', { name: 'Use "Drill"' }));
  await user.type(screen.getByLabelText('Genre'), 'Electronic');
  await user.click(screen.getByRole('option', { name: 'Electronic' }));
  await user.keyboard('{Escape}');
  expect(screen.getByLabelText('Remove Drill')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Search releases' }));
  expect(search.mock.lastCall?.[0].filters.style).toEqual(['Drill']);
});

test.each([
  { genre: 'Rock', style: 'Brit Pop' },
  { genre: 'Funk / Soul', style: 'Gogo' },
  { genre: 'Folk, World, & Country', style: 'Min’yō' },
])(
  'keeps selected reference style $style when the last genre is cleared',
  async ({ genre, style }) => {
    const search = renderDesk();
    const user = userEvent.setup();
    await screen.findByRole('button', { name: 'Connected as quiet-digger' });
    await user.type(screen.getByLabelText('Genre'), genre);
    await user.click(screen.getByRole('option', { name: genre }));
    await user.type(screen.getByLabelText('Style'), style);
    await user.click(screen.getByRole('option', { name: style }));
    await user.keyboard('{Escape}');
    await user.click(screen.getByLabelText(`Remove ${genre}`));
    expect(screen.getByLabelText(`Remove ${style}`)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Search releases' }));
    expect(search.mock.lastCall?.[0].filters.genre).toEqual([]);
    expect(search.mock.lastCall?.[0].filters.style).toEqual([style]);
  },
);
