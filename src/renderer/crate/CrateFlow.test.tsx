import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { CrateBridge } from '../../shared/crate';
import type { DiscogsBridge } from '../../shared/discogs';
import { identityResponse, loadedRelease } from '../../../tests/discogsFixtures';
import { App } from '../App';

test('only marks an EP saved after a completed write, then reopens it without Discogs', async () => {
  const crate: CrateBridge = {
    list: () => Promise.resolve({ ok: true, value: [] }),
    save: vi
      .fn<CrateBridge['save']>()
      .mockResolvedValueOnce({
        ok: false,
        error: { code: 'storage', message: 'Could not save the crate.' },
      })
      .mockResolvedValue({ ok: true, value: [loadedRelease] }),
    remove: vi.fn<CrateBridge['remove']>().mockResolvedValue({ ok: true, value: [] }),
  };
  const discogs: DiscogsBridge = {
    account: () => Promise.resolve({ ok: true, value: identityResponse }),
    connect: vi.fn(),
    loadRelease: vi
      .fn<DiscogsBridge['loadRelease']>()
      .mockResolvedValue({ ok: true, value: loadedRelease }),
    disconnect: () => Promise.resolve({ ok: true, value: undefined }),
    openSettings: vi.fn(),
    search: vi.fn(),
    dig: vi.fn(),
  };
  const user = userEvent.setup();
  const view = render(<App discogs={discogs} crate={crate} />);
  await user.type(await screen.findByLabelText('Discogs release ID'), '12');
  await user.click(screen.getByRole('button', { name: 'Load release' }));
  await user.click(await screen.findByRole('button', { name: 'Save EP to crate' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the crate.');
  expect(screen.getByRole('button', { name: 'Save EP to crate' })).toBeEnabled();
  await user.click(screen.getByRole('button', { name: 'Save EP to crate' }));
  expect(await screen.findByRole('button', { name: 'Saved to crate' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Open Quiet Orbit EP' })).toBeInTheDocument();
  view.unmount();
  const offline: CrateBridge = {
    ...crate,
    list: () => Promise.resolve({ ok: true, value: [loadedRelease] }),
  };
  render(<App crate={offline} />);
  await user.click(await screen.findByRole('button', { name: 'Open Quiet Orbit EP' }));
  expect(await screen.findByRole('heading', { name: 'Quiet Orbit EP' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Discogs not connected' })).toBeDisabled();
  expect(discogs.loadRelease).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole('button', { name: 'Remove Quiet Orbit EP' }));
  await waitFor(() => {
    expect(screen.queryByRole('button', { name: 'Open Quiet Orbit EP' })).not.toBeInTheDocument();
  });
});

test('tries the next saved record artwork after the previous artwork fails', async () => {
  const first = {
    ...loadedRelease,
    title: 'First EP',
    artworkUrl: 'https://i.discogs.com/first.jpg',
  };
  const second = {
    ...loadedRelease,
    id: 13,
    title: 'Second EP',
    artworkUrl: 'https://i.discogs.com/second.jpg',
  };
  const crate: CrateBridge = {
    list: () => Promise.resolve({ ok: true, value: [first, second] }),
    save: vi.fn(),
    remove: vi.fn(),
  };
  const user = userEvent.setup();
  render(<App crate={crate} />);
  await user.click(await screen.findByRole('button', { name: 'Open First EP' }));
  fireEvent.error(screen.getByRole('img', { name: 'First EP record sleeve' }));
  expect(screen.getByText('No artwork available')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Open Second EP' }));
  expect(screen.getByRole('img', { name: 'Second EP record sleeve' })).toHaveAttribute(
    'src',
    'https://i.discogs.com/second.jpg',
  );
});
