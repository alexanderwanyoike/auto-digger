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
