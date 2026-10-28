import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { App } from '../App';
import { loadedRelease } from '../../../tests/discogs-fixtures';

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

test('opens a recommendation release in the desk and returns to the same recommendation results', async () => {
  const loadRecommendation = vi
    .fn()
    .mockResolvedValue({ ok: true, value: { release: loadedRelease, trackIndex: 0 } });
  const probe = vi.fn().mockResolvedValue({
    ok: true,
    value: {
      provider: 'cosine',
      operation: 'similar',
      endpoint: 'https://cosine.club/api/v1/tracks/42/similar',
      httpStatus: 200,
      fields: ['id', 'artist', 'track', 'external_link'],
      note: 'Live recommendation response.',
      items: [
        {
          id: '42',
          title: 'Quiet Orbit',
          artist: 'Low Tide',
          sourceUrl: 'https://discogs.com/release/12',
        },
      ],
    },
  });
  Reflect.set(window, 'apiFeasibility', {
    status: () =>
      Promise.resolve({ ok: true, value: { cosine: true, beatport: false, bandcamp: false } }),
    configure: vi.fn(),
    forget: vi.fn(),
    probe,
    loadRecommendation,
  });
  try {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const panel = screen.getByRole('region', { name: 'API feasibility prototype' });
    await user.selectOptions(within(panel).getByLabelText('Operation'), 'similar');
    await user.clear(within(panel).getByLabelText('Track query or URL'));
    await user.type(within(panel).getByLabelText('Track query or URL'), '42');
    await user.type(within(panel).getByLabelText('From year'), '2000');
    await user.click(within(panel).getByRole('button', { name: 'Run live check' }));
    await user.click(
      await within(panel).findByRole('button', { name: 'Open release for Quiet Orbit' }),
    );
    expect(await screen.findByRole('heading', { name: 'Quiet Orbit EP' })).toBeVisible();
    expect(loadRecommendation).toHaveBeenCalledWith({
      sourceUrl: 'https://discogs.com/release/12',
      title: 'Quiet Orbit',
      artist: 'Low Tide',
    });
    await user.click(screen.getByRole('button', { name: 'Back to recommendations' }));
    expect(within(panel).getByText('Quiet Orbit')).toBeVisible();
    expect(within(panel).getByLabelText('From year')).toHaveValue(2000);
    expect(probe).toHaveBeenCalledTimes(1);
  } finally {
    Reflect.deleteProperty(window, 'apiFeasibility');
  }
});
