import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { DiscogsBridge, DiscogsResult } from '../../shared/discogs';
import { CataloguePage } from './CataloguePage';

test.each(['reselects the style', 'applies a range'] as const)(
  'keeps the displayed style when the listener %s before saved styles arrive',
  async (action) => {
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
    if (action === 'reselects the style') {
      await user.click(screen.getByRole('combobox', { name: 'Style' }));
      await user.click(screen.getByRole('option', { name: 'Progressive House', exact: true }));
    } else {
      await user.type(screen.getByRole('textbox', { name: 'From year' }), '1993');
      await user.type(screen.getByRole('textbox', { name: 'To year' }), '1999');
      await user.click(screen.getByRole('button', { name: 'Go' }));
    }
    await act(async () => {
      styles.resolve({ ok: true, value: ['Techno'] });
    });
    expect(screen.getByText('Progressive House', { exact: true })).toBeInTheDocument();
    expect(screen.queryByText('Techno', { exact: true })).not.toBeInTheDocument();
    if (action === 'applies a range') {
      expect(screen.getByRole('textbox', { name: 'To year' })).toHaveValue('1999');
      expect(bridge.search).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'catalogue-range',
          filters: expect.objectContaining({ style: ['Progressive House'], year: '1993-1999' }),
        }),
      );
    }
  },
);
