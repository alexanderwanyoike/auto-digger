import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { DiscogsBridge, DiscogsResult } from '../../shared/discogs';
import { CataloguePage } from './CataloguePage';

test('keeps an explicitly selected starter style when saved styles arrive', async () => {
  const styles = Promise.withResolvers<DiscogsResult<string[]>>();
  const bridge: DiscogsBridge = {
    account: vi.fn<DiscogsBridge['account']>(),
    connect: vi.fn<DiscogsBridge['connect']>(),
    dig: vi.fn<DiscogsBridge['dig']>(),
    disconnect: vi.fn<DiscogsBridge['disconnect']>(),
    loadRelease: vi.fn<DiscogsBridge['loadRelease']>(),
    openSettings: vi.fn<DiscogsBridge['openSettings']>(),
    crateStyles: () => styles.promise,
    search: vi.fn<DiscogsBridge['search']>().mockResolvedValue({
      ok: true,
      value: { page: 1, pages: 0, perPage: 50, items: 0, releases: [] },
    }),
  };
  const user = userEvent.setup();
  render(
    <CataloguePage
      bridge={bridge}
      busy={false}
      active={false}
      onOpen={vi.fn()}
      onPreview={undefined}
      previewBusy={false}
      onShowYear={vi.fn()}
      onUnauthorized={vi.fn()}
    />,
  );
  await user.click(screen.getByRole('combobox', { name: 'Style' }));
  await user.click(screen.getByRole('option', { name: 'Progressive House', exact: true }));
  await act(async () => {
    styles.resolve({ ok: true, value: ['Techno'] });
  });
  expect(screen.getByText('Progressive House', { exact: true })).toBeInTheDocument();
  expect(screen.queryByText('Techno', { exact: true })).not.toBeInTheDocument();
});
