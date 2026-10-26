import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { defaultPreferences } from '../../shared/preferences';
import type { PreferencesBridge } from '../../shared/preferences';
import { App } from '../App';

test('edits a folder path while keeping every placeholder visible and preserves it with appearance changes', async () => {
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
    const input = await screen.findByRole('textbox', { name: 'Folder layout' });
    expect(input).toHaveValue('<source>/<genre>/<subgenre>/<year>');
    await user.clear(input);
    expect(
      screen.queryByRole('combobox', { name: 'Download organisation' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Move .* up/ })).not.toBeInTheDocument();
    await user.type(input, '<source>/<genre>/<subgenre>/<artist>/<release>');
    expect(screen.getByLabelText('Folder preview')).toHaveTextContent(
      '/music/Auto Digger / YouTube / Electronic / Deep House / Low Tide / Quiet Orbit EP [r12]',
    );
    await user.click(screen.getByRole('button', { name: 'Save folder layout' }));
    expect(save).toHaveBeenLastCalledWith({
      material: 'aluminium',
      accent: 'blue',
      layout: 'custom',
      folderTemplate: '<source>/<genre>/<subgenre>/<artist>/<release>',
    });
    await user.click(screen.getByRole('radio', { name: 'Green' }));
    expect(save).toHaveBeenLastCalledWith({
      material: 'aluminium',
      accent: 'green',
      layout: 'custom',
      folderTemplate: '<source>/<genre>/<subgenre>/<artist>/<release>',
    });
    await user.clear(input);
    await user.type(input, '<source>');
    const reference = screen.getByLabelText('Available folder placeholders');
    ['<source>', '<genre>', '<subgenre>', '<year>', '<label>', '<artist>', '<release>'].forEach(
      (token) => {
        expect(reference).toHaveTextContent(token);
      },
    );
    await user.clear(input);
    await user.click(screen.getByRole('button', { name: 'Save folder layout' }));
    expect(save).toHaveBeenLastCalledWith({
      material: 'aluminium',
      accent: 'green',
      layout: 'custom',
      folderTemplate: '',
    });
    expect(screen.getByLabelText('Folder preview')).toHaveTextContent(
      '/music/Auto Digger / track.mp3',
    );
  } finally {
    delete window.preferences;
  }
});
