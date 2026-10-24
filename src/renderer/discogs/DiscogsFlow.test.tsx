import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { DiscogsBridge } from '../../shared/discogs';
import { identityResponse, loadedRelease } from '../../../tests/discogsFixtures';
import { App } from '../App';

function mockBridge(): DiscogsBridge {
  return {
    account: vi.fn<DiscogsBridge['account']>().mockResolvedValue({ ok: true, value: null }),
    connect: vi
      .fn<DiscogsBridge['connect']>()
      .mockResolvedValue({ ok: true, value: identityResponse }),
    loadRelease: vi
      .fn<DiscogsBridge['loadRelease']>()
      .mockResolvedValue({ ok: true, value: loadedRelease }),
    disconnect: vi
      .fn<DiscogsBridge['disconnect']>()
      .mockResolvedValue({ ok: true, value: undefined }),
    openSettings: vi
      .fn<DiscogsBridge['openSettings']>()
      .mockResolvedValue({ ok: true, value: undefined }),
  };
}

test('connects, clears the submitted token, shows release metadata and disconnects', async () => {
  const bridge = mockBridge();
  const user = userEvent.setup();
  render(<App discogs={bridge} />);
  const connect = screen.getByRole('button', { name: 'Discogs not connected' });
  await waitFor(() => {
    expect(connect).toBeEnabled();
  });
  await user.click(connect);
  await user.type(screen.getByLabelText('Personal token'), 'private-token');
  await user.click(screen.getByRole('button', { name: 'Connect account' }));
  await screen.findByRole('button', { name: 'Connected as quiet-digger' });
  expect(screen.queryByLabelText('Personal token')).not.toBeInTheDocument();
  expect(bridge.connect).toHaveBeenCalledWith('private-token');
  await user.type(screen.getByLabelText('Discogs release ID'), '12');
  await user.click(screen.getByRole('button', { name: 'Load release' }));
  expect(await screen.findByRole('heading', { name: 'Quiet Orbit EP' })).toBeInTheDocument();
  expect(screen.getByText('Low Tide')).toBeInTheDocument();
  expect(screen.getByText('Still Records')).toBeInTheDocument();
  expect(screen.getByText('A1')).toBeInTheDocument();
  expect(screen.getByText('Quiet Orbit')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Connected as quiet-digger' }));
  await user.click(screen.getByRole('button', { name: 'Disconnect' }));
  await screen.findByRole('button', { name: 'Discogs not connected' });
  expect(screen.queryByRole('heading', { name: 'Quiet Orbit EP' })).not.toBeInTheDocument();
  expect(bridge.disconnect).toHaveBeenCalledOnce();
});
