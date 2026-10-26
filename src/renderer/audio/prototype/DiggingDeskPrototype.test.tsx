import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test } from 'vitest';
import { App } from '../../App';

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

test('offers Soulseek on the digging desk without a source-management screen', async () => {
  window.history.replaceState(null, '', '/?prototype=audio-sources&variant=A');
  const user = userEvent.setup();
  render(<App />);

  expect(await screen.findByRole('heading', { name: 'Quiet Orbit EP' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Digging desk' })).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Download audio for Quiet Orbit (Original Mix)' }),
  ).toBeEnabled();
  expect(screen.queryByLabelText('Soulseek search query')).not.toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'Prototype layout' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Library folder')).not.toBeInTheDocument();

  await user.click(
    screen.getByRole('button', { name: 'Use Soulseek for Quiet Orbit (Original Mix)' }),
  );
  expect(screen.getByRole('button', { name: 'Download from tape_archive' })).toBeEnabled();
  expect(screen.getByLabelText('Soulseek search query')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Downloads' }));
  expect(screen.getByRole('region', { name: 'Downloaded library' })).toBeVisible();
});

test('refines the search at the top and cleans punctuation without renaming the track', async () => {
  window.history.replaceState(null, '', '/?prototype=audio-sources');
  const user = userEvent.setup();
  render(<App />);
  await user.click(
    await screen.findByRole('button', { name: 'Use Soulseek for Quiet Orbit (Original Mix)' }),
  );
  await user.clear(screen.getByLabelText('Soulseek search query'));
  await user.type(screen.getByLabelText('Soulseek search query'), 'Björk / Jóga (Live) [[1997]?!');
  expect(screen.getByLabelText('Clean Soulseek query')).toHaveTextContent('Björk Jóga Live 1997');
  await user.click(screen.getByRole('button', { name: 'Search' }));
  expect(screen.getByText('Quiet Orbit (Original Mix)', { exact: true })).toBeVisible();
});

test.each(['normal', 'private-only'])(
  'keeps %s private results out of the main match list',
  async (scenario) => {
    window.history.replaceState(null, '', `/?prototype=audio-sources&scenario=${scenario}`);
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      await screen.findByRole('button', { name: 'Use Soulseek for Quiet Orbit (Original Mix)' }),
    );
    expect(screen.getByText('Private match from locked_crate')).not.toBeVisible();
    await user.click(screen.getByText('1 private match'));
    expect(screen.getByText('Private match from locked_crate')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Download from locked_crate' })).toBeDisabled();
    if (scenario === 'private-only') {
      expect(screen.getByText('Only private matches found. Try a broader search.')).toBeVisible();
      expect(screen.queryByText('No matches found. Try a broader search.')).not.toBeInTheDocument();
    }
  },
);

test('downloads from the match list and returns to the track without duplicate-copy controls', async () => {
  window.history.replaceState(null, '', '/?prototype=audio-sources');
  const user = userEvent.setup();
  render(<App />);
  await user.click(
    await screen.findByRole('button', { name: 'Use Soulseek for Quiet Orbit (Original Mix)' }),
  );
  await user.click(screen.getByRole('button', { name: 'Download from tape_archive' }));
  expect(screen.getByText('Queued in this demo')).toBeVisible();
  expect(await screen.findByText('Saved from Soulseek')).toBeVisible();
  expect(screen.queryByRole('region', { name: 'Soulseek matches' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Advance demo transfer' })).not.toBeInTheDocument();
  await user.click(
    screen.getByRole('button', { name: 'Use Soulseek for Quiet Orbit (Original Mix)' }),
  );
  const matches = screen.getByRole('region', { name: 'Soulseek matches' });
  expect(
    within(matches).getByRole('button', { name: 'Download from tape_archive' }),
  ).toBeDisabled();
});

test('places editable search above a compact list of matches from different peers', async () => {
  window.history.replaceState(null, '', '/?prototype=audio-sources');
  const user = userEvent.setup();
  render(<App />);
  await user.click(
    await screen.findByRole('button', { name: 'Use Soulseek for Quiet Orbit (Original Mix)' }),
  );
  const form = screen.getByRole('form', { name: 'Refine Soulseek search' });
  const results = screen.getByRole('list', { name: 'Soulseek search results' });
  expect(form).toBeVisible();
  expect(form.compareDocumentPosition(results) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(within(results).getAllByRole('listitem')).toHaveLength(3);
  expect(within(results).getByRole('button', { name: 'Download from tape_archive' })).toBeEnabled();
  expect(within(results).getByRole('button', { name: 'Download from deep_shelves' })).toBeEnabled();
  expect(
    within(results).getByRole('button', { name: 'Download from night_collection' }),
  ).toBeEnabled();
  expect(within(results).queryByText('Private match from locked_crate')).not.toBeInTheDocument();
});
