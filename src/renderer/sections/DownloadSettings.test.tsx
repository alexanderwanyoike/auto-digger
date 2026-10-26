import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { defaultPreferences } from '../../shared/preferences';
import type { PreferencesBridge } from '../../shared/preferences';
import { App } from '../App';

test('defines and reorders folder levels with a live preview and preserves them with appearance changes', async () => {
  const save = vi
    .fn<PreferencesBridge['save']>()
    .mockImplementation((input) =>
      Promise.resolve({ ok: true, value: { ...input, directory: '/music/Auto Digger' } }),
    );
  window.preferences = {
    read: () =>
      Promise.resolve({
        ok: true,
        value: { ...defaultPreferences, directory: '/music/Auto Digger' },
      }),
    save,
    chooseDirectory: vi.fn(),
  };
  const user = userEvent.setup();
  try {
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Download organisation' }),
      'custom',
    );
    await user.selectOptions(screen.getByRole('combobox', { name: 'Add folder level' }), 'source');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Add folder level' }), 'genre');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Add folder level' }), 'year');
    await user.click(screen.getByRole('button', { name: 'Move year up' }));
    await waitFor(() => {
      expect(save).toHaveBeenLastCalledWith({
        material: 'aluminium',
        accent: 'blue',
        layout: 'custom',
        folders: ['source', 'year', 'genre'],
      });
    });
    expect(screen.getByLabelText('Folder preview')).toHaveTextContent(
      '/music/Auto Digger / YouTube / 1998 / Electronic',
    );
    await user.click(screen.getByRole('radio', { name: 'Green' }));
    expect(save).toHaveBeenLastCalledWith({
      material: 'aluminium',
      accent: 'green',
      layout: 'custom',
      folders: ['source', 'year', 'genre'],
    });
    await user.click(screen.getByRole('button', { name: 'Remove year folder' }));
    expect(save).toHaveBeenLastCalledWith({
      material: 'aluminium',
      accent: 'green',
      layout: 'custom',
      folders: ['source', 'genre'],
    });
  } finally {
    delete window.preferences;
  }
});
