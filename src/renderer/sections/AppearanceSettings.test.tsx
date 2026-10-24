import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { PreferencesBridge } from '../../shared/preferences';
import { defaultPreferences } from '../../shared/preferences';
import { App } from '../App';

test('chooses a material, mode and accent visually while preserving download settings', async () => {
  const save = vi
    .fn<PreferencesBridge['save']>()
    .mockImplementation((input) =>
      Promise.resolve({ ok: true, value: { ...input, directory: '/music' } }),
    );
  window.preferences = {
    read: () =>
      Promise.resolve({
        ok: true,
        value: { ...defaultPreferences, directory: '/music', layout: 'release' },
      }),
    save,
    chooseDirectory: vi.fn(),
  };
  const user = userEvent.setup();
  try {
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Settings', exact: true }));
    const appearance = screen.getByRole('region', { name: 'Appearance settings' });
    const material = within(appearance).getByRole('group', { name: 'Material', exact: true });
    expect(
      await within(material).findByRole('radio', { name: 'Brushed aluminium', exact: true }),
    ).toBeChecked();
    await user.click(within(material).getByRole('radio', { name: 'Ceramic', exact: true }));
    expect(save).toHaveBeenCalledWith({ material: 'ceramic', accent: 'blue', layout: 'release' });
    expect(document.documentElement).toHaveAttribute('data-material', 'ceramic');
    const mode = within(appearance).getByRole('group', { name: 'Appearance mode' });
    await user.click(within(mode).getByRole('radio', { name: 'Dark', exact: true }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(window.localStorage.getItem('auto-digger.appearance')).toBe('dark');
    const accent = within(appearance).getByRole('group', { name: 'Accent colour' });
    await user.click(within(accent).getByRole('radio', { name: 'Teal', exact: true }));
    expect(save).toHaveBeenLastCalledWith({
      material: 'ceramic',
      accent: 'teal',
      layout: 'release',
    });
    expect(within(accent).getByRole('radio', { name: 'Teal', exact: true })).toBeChecked();
    expect(document.documentElement).toHaveAttribute('data-accent', 'teal');
  } finally {
    delete window.preferences;
  }
});

test('shows a pending material choice immediately and restores the saved choice if storage rejects it', async () => {
  let complete: (value: import('../../shared/preferences').PreferencesResult) => void = () => {
    throw new Error('No pending save');
  };
  window.preferences = {
    read: () => Promise.resolve({ ok: true, value: defaultPreferences }),
    save: () =>
      new Promise((resolveSave) => {
        complete = resolveSave;
      }),
    chooseDirectory: vi.fn(),
  };
  const user = userEvent.setup();
  try {
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Settings', exact: true }));
    const appearance = screen.getByRole('region', { name: 'Appearance settings' });
    await user.click(within(appearance).getByRole('radio', { name: 'Slate', exact: true }));
    expect(within(appearance).getByRole('radio', { name: 'Slate', exact: true })).toBeChecked();
    const { act } = await import('@testing-library/react');
    await act(async () => {
      complete({
        ok: false,
        error: { code: 'storage', message: 'The change could not be saved.' },
      });
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be saved');
    expect(
      within(appearance).getByRole('radio', { name: 'Brushed aluminium', exact: true }),
    ).toBeChecked();
    expect(document.documentElement).toHaveAttribute('data-material', 'aluminium');
  } finally {
    delete window.preferences;
  }
});
