import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { DiscogsBridge, DiscogsResult } from '../../shared/discogs';
import { CataloguePage } from './CataloguePage';

test.each(['reselects the style', 'applies a range'] as const)(
  'keeps the displayed style when the listener %s before saved styles arrive',
  async (action) => {
    let resolveStyles: ((result: DiscogsResult<string[]>) => void) | undefined;
    const styles = new Promise<DiscogsResult<string[]>>((resolve) => {
      resolveStyles = resolve;
    });
    const bridge: DiscogsBridge = {
      account: vi.fn<DiscogsBridge['account']>(),
      connect: vi.fn<DiscogsBridge['connect']>(),
      dig: vi.fn<DiscogsBridge['dig']>(),
      disconnect: vi.fn<DiscogsBridge['disconnect']>(),
      loadRelease: vi.fn<DiscogsBridge['loadRelease']>(),
      openSettings: vi.fn<DiscogsBridge['openSettings']>(),
      crateStyles: () => styles,
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
      await user.click(screen.getByRole('option', { name: 'Progressive House' }));
    } else {
      await user.type(screen.getByRole('textbox', { name: 'From year' }), '1993');
      await user.type(screen.getByRole('textbox', { name: 'To year' }), '1999');
      await user.click(screen.getByRole('button', { name: 'Go' }));
    }
    await act(async () => {
      resolveStyles?.({ ok: true, value: ['Techno'] });
      await styles;
    });
    expect(screen.getByText('Progressive House', { exact: true })).toBeInTheDocument();
    expect(screen.queryByText('Techno', { exact: true })).not.toBeInTheDocument();
    if (action === 'applies a range') {
      expect(screen.getByRole('textbox', { name: 'To year' })).toHaveValue('1999');
      expect(vi.mocked(bridge.search).mock.calls[0]?.[0].filters.style).toEqual([
        'Progressive House',
      ]);
      expect(vi.mocked(bridge.search).mock.calls[0]?.[0].filters.year).toBe('1993-1999');
    }
  },
);
