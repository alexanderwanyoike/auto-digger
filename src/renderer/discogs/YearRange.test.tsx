import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { DiscogsBridge } from '../../shared/discogs';
import { identityResponse } from '../../../tests/discogsFixtures';
import { App } from '../App';

test('submits a full year range from the digging form', async () => {
  const search = vi.fn<DiscogsBridge['search']>().mockResolvedValue({
    ok: true,
    value: {
      page: 1,
      pages: 0,
      perPage: 50,
      items: 0,
      releases: [],
    },
  });
  const bridge: DiscogsBridge = {
    account: () => Promise.resolve({ ok: true, value: identityResponse }),
    search,
    dig: vi.fn(),
    connect: vi.fn(),
    loadRelease: vi.fn(),
    disconnect: vi.fn(),
    openSettings: vi.fn(),
  };
  const user = userEvent.setup();
  render(<App discogs={bridge} />);
  await screen.findByRole('button', { name: 'Connected as quiet-digger' });
  await user.type(screen.getByLabelText('Year', { exact: true }), '1990-1999');
  await user.click(screen.getByRole('button', { name: 'Search releases' }));
  expect(search).toHaveBeenCalledWith(
    expect.objectContaining({ filters: expect.objectContaining({ year: '1990-1999' }) }),
  );
});
