import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { App } from '../App';

test('tests session credentials and explicit recommendations from Settings without exposing the key', async () => {
  const status = { cosine: false, beatport: false, bandcamp: false };
  const configure = vi.fn().mockResolvedValue({ ok: true, value: { ...status, cosine: true } });
  const probe = vi.fn().mockResolvedValue({
    ok: true,
    value: {
      provider: 'cosine',
      operation: 'lookup',
      endpoint: 'https://cosine.club/api/v1/tracks/lookup',
      httpStatus: 200,
      fields: ['id', 'artist', 'track'],
      items: [{ id: '41731', title: 'Primary Funktion', artist: 'Hipp-E' }],
      note: 'Live API response. Choose a track before requesting recommendations.',
    },
  });
  Reflect.set(window, 'apiFeasibility', {
    status: () => Promise.resolve({ ok: true, value: status }),
    configure,
    probe,
    forget: vi.fn(),
  });
  try {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const panel = screen.getByRole('region', { name: 'API feasibility prototype' });
    const key = within(panel).getByLabelText('Cosine Club API key');
    expect(key).toHaveAttribute('type', 'password');
    await user.type(key, 'private-test-key');
    await user.click(within(panel).getByRole('button', { name: 'Use for this session' }));
    expect(configure).toHaveBeenCalledWith('cosine', 'private-test-key');
    expect(key).toHaveValue('');
    expect(panel).not.toHaveTextContent('private-test-key');
    await user.selectOptions(within(panel).getByLabelText('Operation'), 'lookup');
    await user.clear(within(panel).getByLabelText('Track query or URL'));
    await user.type(
      within(panel).getByLabelText('Track query or URL'),
      'https://www.youtube.com/watch?v=BnvG83gMLEk',
    );
    await user.click(within(panel).getByRole('button', { name: 'Run live check' }));
    expect(await within(panel).findByText('Primary Funktion')).toBeVisible();
    expect(probe).toHaveBeenCalledTimes(1);
    await user.click(
      within(panel).getByRole('button', { name: 'Similar tracks for Primary Funktion' }),
    );
    expect(probe).toHaveBeenLastCalledWith(
      expect.objectContaining({ provider: 'cosine', operation: 'similar', query: '41731' }),
    );
  } finally {
    Reflect.deleteProperty(window, 'apiFeasibility');
  }
});

test('keeps the experiment out of normal Settings', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  expect(screen.queryByRole('region', { name: 'API feasibility prototype' })).toBeNull();
});
