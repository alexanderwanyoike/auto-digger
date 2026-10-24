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
  expect(screen.getByLabelText('0 saved releases')).toBeInTheDocument();
  expect(screen.getByLabelText('Label')).toBeDisabled();
  expect(screen.getByLabelText('Artist')).toBeDisabled();
  expect(screen.getByLabelText('Year')).toBeDisabled();
  expect(screen.getByLabelText('Genre')).toBeDisabled();
  expect(screen.getByLabelText('Style')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Search EPs' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled();
  expect(screen.getByText('Connect your Discogs account.')).toBeInTheDocument();
  expect(screen.getByText('Preview a source to listen here.')).toBeInTheDocument();
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

test.each(['getItem', 'setItem'] as const)(
  'keeps appearance usable and explains when storage %s is unavailable',
  async (operation) => {
    vi.spyOn(Storage.prototype, operation).mockImplementation(() => {
      throw new DOMException('Storage is blocked', 'SecurityError');
    });
    const user = userEvent.setup();
    render(<App />);

    if (operation === 'getItem') {
      expect(screen.getByRole('status')).toHaveTextContent('could not be saved');
    }
    await user.click(screen.getByRole('button', { name: 'Dark' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    if (operation === 'setItem') {
      expect(screen.getByRole('status')).toHaveTextContent('could not be saved');
    }
  },
);
