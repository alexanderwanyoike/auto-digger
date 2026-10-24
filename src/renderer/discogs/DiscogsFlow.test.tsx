import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { DiscogsBridge } from '../../shared/discogs';
import { identityResponse, loadedRelease } from '../../../tests/discogsFixtures';
import { App } from '../App';

function mockBridge(): DiscogsBridge {
  return {
    search: vi.fn<DiscogsBridge['search']>().mockResolvedValue({
      ok: true,
      value: { page: 1, pages: 0, perPage: 50, items: 0, releases: [] },
    }),
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
  expect(screen.getByText('Connected for this session.')).toBeInTheDocument();
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

test('invalid credentials leave the token field empty and keep the dialog open', async () => {
  const bridge = mockBridge();
  vi.mocked(bridge.connect).mockResolvedValue({
    ok: false,
    error: { code: 'unauthorized', message: 'Discogs rejected this token.' },
  });
  const user = userEvent.setup();
  render(<App discogs={bridge} />);
  const connect = screen.getByRole('button', { name: 'Discogs not connected' });
  await waitFor(() => {
    expect(connect).toBeEnabled();
  });
  await user.click(connect);
  await user.type(screen.getByLabelText('Personal token'), 'wrong-token');
  await user.click(screen.getByRole('button', { name: 'Connect account' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Discogs rejected this token.');
  expect(screen.getByLabelText('Personal token')).toHaveValue('');
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});

test('shows a rate limit error without losing the account and allows retry', async () => {
  const bridge = mockBridge();
  vi.mocked(bridge.account).mockResolvedValue({ ok: true, value: identityResponse });
  vi.mocked(bridge.loadRelease).mockResolvedValueOnce({
    ok: false,
    error: { code: 'rate-limited', message: 'Please wait a minute and try again.' },
  });
  const user = userEvent.setup();
  render(<App discogs={bridge} />);
  await user.type(await screen.findByLabelText('Discogs release ID'), '12');
  await user.click(screen.getByRole('button', { name: 'Load release' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Please wait a minute');
  expect(screen.getByRole('button', { name: 'Connected as quiet-digger' })).toBeEnabled();
  await user.click(screen.getByRole('button', { name: 'Load release' }));
  expect(await screen.findByRole('heading', { name: 'Quiet Orbit EP' })).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('falls back to the sleeve placeholder if remote artwork fails', async () => {
  const { fireEvent } = await import('@testing-library/react');
  const { ReleaseDetails } = await import('./ReleaseDetails');
  render(
    <ReleaseDetails
      release={{ ...loadedRelease, artworkUrl: 'https://i.discogs.com/unavailable.jpg' }}
    />,
  );
  fireEvent.error(screen.getByRole('img', { name: 'Quiet Orbit EP record sleeve' }));
  expect(await screen.findByText('No artwork available')).toBeInTheDocument();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});

test('shows a catalogue fallback for a label without a catalogue number', async () => {
  const { ReleaseDetails } = await import('./ReleaseDetails');
  render(
    <ReleaseDetails
      release={{ ...loadedRelease, labels: [{ name: 'Still Records', catalogueNumber: '' }] }}
    />,
  );
  expect(screen.getByText('Catalogue number not listed')).toBeInTheDocument();
});
