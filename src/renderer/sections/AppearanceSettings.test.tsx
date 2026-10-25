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
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const appearance = screen.getByRole('region', { name: 'Appearance settings' });
    const material = within(appearance).getByRole('group', { name: 'Material' });
    expect(within(material).getAllByRole('radio')).toHaveLength(7);
    expect(await within(material).findByRole('radio', { name: 'Brushed aluminium' })).toBeChecked();
    await user.click(within(material).getByRole('radio', { name: 'Carbon' }));
    expect(save).toHaveBeenCalledWith({ material: 'carbon', accent: 'blue', layout: 'release' });
    expect(document.documentElement).toHaveAttribute('data-material', 'carbon');
    const mode = within(appearance).getByRole('group', { name: 'Appearance mode' });
    await user.click(within(mode).getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(window.localStorage.getItem('auto-digger.appearance')).toBe('dark');
    const accent = within(appearance).getByRole('group', { name: 'Accent colour' });
    expect(within(accent).getAllByRole('radio')).toHaveLength(7);
    await user.click(within(accent).getByRole('radio', { name: 'Rose' }));
    expect(save).toHaveBeenLastCalledWith({
      material: 'carbon',
      accent: 'rose',
      layout: 'release',
    });
    expect(within(accent).getByRole('radio', { name: 'Rose' })).toBeChecked();
    expect(document.documentElement).toHaveAttribute('data-accent', 'rose');
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
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const appearance = screen.getByRole('region', { name: 'Appearance settings' });
    await user.click(within(appearance).getByRole('radio', { name: 'Slate' }));
    expect(within(appearance).getByRole('radio', { name: 'Slate' })).toBeChecked();
    const { act } = await import('@testing-library/react');
    await act(async () => {
      complete({
        ok: false,
        error: { code: 'storage', message: 'The change could not be saved.' },
      });
      await Promise.resolve();
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be saved');
    expect(within(appearance).getByRole('radio', { name: 'Brushed aluminium' })).toBeChecked();
    expect(document.documentElement).toHaveAttribute('data-material', 'aluminium');
  } finally {
    delete window.preferences;
  }
});
