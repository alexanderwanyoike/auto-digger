import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { App } from '../App';
import type { SoulseekBridge } from '../../shared/soulseek';

test('configures the external service separately from download organisation and clears the entered API key', async () => {
  const configure = vi
    .fn<SoulseekBridge['configure']>()
    .mockResolvedValue({
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
    expect(screen.getByLabelText('Download organisation')).toHaveValue('flat');
  } finally {
    delete window.soulseek;
  }
});
