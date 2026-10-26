import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test } from 'vitest';
import { App } from '../../App';

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

test('opens a demo in Downloads and shows the cleaned Soulseek query without changing the title', async () => {
  window.history.replaceState(null, '', '/?prototype=audio-sources&variant=A');
  const user = userEvent.setup();
  render(<App />);

  expect(await screen.findByRole('heading', { name: 'Audio sources prototype' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Downloads' })).toBeVisible();
  await user.clear(screen.getByLabelText('Soulseek search query'));
  await user.type(screen.getByLabelText('Soulseek search query'), 'Björk / Jóga (Live) [[1997]?!');
  expect(screen.getByLabelText('Soulseek query sent')).toHaveTextContent('Björk Jóga Live 1997');
  expect(screen.getByRole('heading', { name: 'Quiet Orbit (Original Mix)' })).toBeVisible();
  expect(
    screen.getByText('Demo data. No searches, downloads or files leave this page.'),
  ).toBeVisible();
});
test('labels private Soulseek matches, prevents saving them and preserves a private-only outcome when hidden', async () => {
  window.history.replaceState(null, '', '/?prototype=audio-sources&variant=A');
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole('button', { name: 'Check audio sources' }));

  expect(screen.getByText('Private match from locked_crate')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Save demo copy from locked_crate' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Save demo copy from tape_archive' })).toBeEnabled();
  await user.click(screen.getByLabelText('Show private results'));
  expect(screen.queryByText('Private match from locked_crate')).not.toBeInTheDocument();
  expect(screen.getByText('1 private match hidden')).toBeVisible();

  await user.selectOptions(screen.getByLabelText('Search scenario'), 'private-only');
  await user.click(screen.getByRole('button', { name: 'Check audio sources' }));
  expect(screen.getByText('Only private matches found on Soulseek.')).toBeVisible();
  expect(screen.queryByText('No matches found on Soulseek.')).not.toBeInTheDocument();
});
