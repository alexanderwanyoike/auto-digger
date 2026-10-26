import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { App } from '../App';
import type { SoulseekBridge } from '../../shared/soulseek';
import { SoulseekSettings } from './SoulseekSettings';

test('configures the external service separately from download organisation and clears the entered API key', async () => {
  const configure = vi.fn<SoulseekBridge['configure']>().mockResolvedValue({
    ok: true,
    value: { url: 'http://127.0.0.1:5030', directory: '/music/slskd', configured: true },
  });
  window.soulseek = {
    settings: () => Promise.resolve({ ok: true, value: null }),
    configure,
    disconnect: vi.fn(),
    search: vi.fn(),
    results: vi.fn(),
    stop: vi.fn(),
  };
  const user = userEvent.setup();
  try {
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.type(await screen.findByLabelText('slskd API key'), 'private-test-key');
    await user.type(screen.getByLabelText('slskd completed-downloads folder'), '/music/slskd');
    await user.click(screen.getByRole('button', { name: 'Connect slskd' }));
    expect(configure).toHaveBeenCalledWith({
      url: 'http://127.0.0.1:5030',
      directory: '/music/slskd',
      apiKey: 'private-test-key',
    });
    expect(await screen.findByText('slskd connection saved.')).toBeVisible();
    expect(screen.getByLabelText('slskd API key')).toHaveValue('');
    expect(screen.getByLabelText('Folder layout')).toHaveValue(
      '<source>/<genre>/<subgenre>/<year>',
    );
  } finally {
    delete window.soulseek;
  }
});

test('can forget unreadable saved settings without decrypting them', async () => {
  const disconnect = vi
    .fn<SoulseekBridge['disconnect']>()
    .mockResolvedValue({ ok: true, value: undefined });
  window.soulseek = {
    settings: () =>
      Promise.resolve({
        ok: false,
        error: { code: 'storage', message: 'Saved settings could not be unlocked.' },
      }),
    configure: vi.fn(),
    disconnect,
    search: vi.fn(),
    results: vi.fn(),
    stop: vi.fn(),
  };
  try {
    const user = userEvent.setup();
    render(<SoulseekSettings />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Saved settings could not be unlocked.',
    );
    await user.click(screen.getByRole('button', { name: 'Forget slskd connection' }));
    expect(disconnect).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Forget slskd connection' }),
    ).not.toBeInTheDocument();
  } finally {
    delete window.soulseek;
  }
});
