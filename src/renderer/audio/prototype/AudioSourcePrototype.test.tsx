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
