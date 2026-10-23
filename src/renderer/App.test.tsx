import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { App } from './App';

test('opens a digging desk with honest empty states and inactive upcoming features', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Digging desk' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Your next find starts here.' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Your crate' })).toBeInTheDocument();
  expect(screen.getByText('Discogs not connected')).toBeInTheDocument();
  expect(screen.getByText('No records saved yet.')).toBeInTheDocument();
  expect(screen.getByLabelText('Label')).toBeDisabled();
  expect(screen.getByLabelText('Artist')).toBeDisabled();
  expect(screen.getByLabelText('Year')).toBeDisabled();
  expect(screen.getByLabelText('Genre')).toBeDisabled();
  expect(screen.getByLabelText('Style')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Start digging' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled();
  expect(screen.getByText('Discogs connection comes in Phase 2.')).toBeInTheDocument();
  expect(screen.getByText('YouTube playback comes in Phase 5.')).toBeInTheDocument();
});

test('switches appearance, remembers the choice and follows changes to the system theme', async () => {
  const media = Object.assign(new EventTarget(), { matches: false });
  vi.stubGlobal('matchMedia', () => media);
  const user = userEvent.setup();
  const view = render(<App />);

  expect(screen.getByRole('button', { name: 'System' })).toHaveAttribute('aria-pressed', 'true');
  expect(document.documentElement).toHaveAttribute('data-theme', 'light');

  await user.click(screen.getByRole('button', { name: 'Dark' }));
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  view.unmount();
  render(<App />);
  expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');

  await user.click(screen.getByRole('button', { name: 'Light' }));
  expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  await user.click(screen.getByRole('button', { name: 'System' }));
  const { act } = await import('@testing-library/react');
  act(() => {
    media.matches = true;
    media.dispatchEvent(new Event('change'));
  });
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
});
