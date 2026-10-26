import { render, screen, within } from '@testing-library/react';
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

test('keeps a single track row and requires a deliberate second copy across providers', async () => {
  window.history.replaceState(null, '', '/?prototype=audio-sources&variant=A');
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole('button', { name: 'Check audio sources' }));
  await user.click(screen.getByRole('button', { name: 'Save demo copy from tape_archive' }));
  expect(screen.getByText('Queued in slskd')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Advance demo transfer' }));
  await user.click(screen.getByRole('button', { name: 'Advance demo transfer' }));
  await user.click(screen.getByRole('button', { name: 'Advance demo transfer' }));
  expect(screen.getByRole('button', { name: 'Save demo copy from tape_archive' })).toBeDisabled();

  await user.click(screen.getByRole('button', { name: 'Save demo copy from harbour_tapes' }));
  expect(screen.getByText('You already have audio for this track.')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Keep another copy' }));
  await user.click(screen.getByRole('button', { name: 'Advance demo transfer' }));
  await user.click(screen.getByRole('button', { name: 'Advance demo transfer' }));
  await user.click(screen.getByRole('button', { name: 'Advance demo transfer' }));

  const library = screen.getByRole('region', { name: 'Demo library' });
  expect(
    within(library).getAllByRole('row', { name: /Quiet Orbit \(Original Mix\)/ }),
  ).toHaveLength(1);
  const copies = screen.getByRole('list', { name: 'Saved copies for Quiet Orbit (Original Mix)' });
  expect(within(copies).getAllByRole('listitem')).toHaveLength(2);
  expect(screen.getByText('Preferred: Soulseek')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Use YouTube copy' }));
  expect(screen.getByText('Preferred: YouTube')).toBeVisible();
});
test('compares three layouts without losing the search and previews user-chosen source folders', async () => {
  window.history.replaceState(null, '', '/?prototype=audio-sources&variant=A');
  const user = userEvent.setup();
  render(<App />);
  const query = await screen.findByLabelText('Soulseek search query');
  await user.clear(query);
  await user.type(query, 'Quiet / Orbit?!');
  await user.clear(screen.getByLabelText('Library folder'));
  await user.type(screen.getByLabelText('Library folder'), '/music/digs');
  await user.click(screen.getByLabelText('Separate folders by source'));
  expect(screen.getByLabelText('Destination preview')).toHaveTextContent(
    '/music/digs/Soulseek/Low Tide - Quiet Orbit EP [r12]/A1 - Quiet Orbit (Original Mix).mp3',
  );
  await user.click(screen.getByRole('button', { name: 'Next layout' }));
  expect(screen.getByText('B · Source inspector')).toBeVisible();
  expect(screen.getByLabelText('Soulseek search query')).toHaveValue('Quiet / Orbit?!');
  await user.click(screen.getByRole('heading', { name: 'Audio sources prototype' }));
  await user.keyboard('{ArrowRight}');
  expect(screen.getByText('C · Release shelves')).toBeVisible();
  expect(new URLSearchParams(window.location.search).get('variant')).toBe('C');
  await user.click(screen.getByLabelText('Soulseek search query'));
  await user.keyboard('{ArrowLeft}');
  expect(screen.getByText('C · Release shelves')).toBeVisible();
});
