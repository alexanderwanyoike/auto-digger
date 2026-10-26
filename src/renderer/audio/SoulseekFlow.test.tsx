import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { App } from '../App';
import { loadedRelease } from '../../../tests/discogs-fixtures';
import type { AudioBridge, LocalTrack } from '../../shared/audio';
import type { SoulseekBridge } from '../../shared/soulseek';

test('refines a real search, keeps private matches separate and downloads a public match from the desk table', async () => {
  const id = 'a'.repeat(32);
  const match = {
    id,
    username: 'peer',
    filename: 'Music\\Quiet Orbit.mp3',
    size: 123,
    bitRate: 320,
    length: 372,
    access: 'public' as const,
  };
  const search = vi
    .fn<SoulseekBridge['search']>()
    .mockResolvedValue({ ok: true, value: { id: 'search', query: 'Low Tide Quiet Orbit' } });
  window.soulseek = {
    settings: vi.fn(),
    configure: vi.fn(),
    disconnect: vi.fn(),
    search,
    results: () =>
      Promise.resolve({
        ok: true,
        value: {
          complete: true,
          privateCount: 1,
          matches: [
            match,
            { ...match, id: 'b'.repeat(32), username: 'private_peer', access: 'private' },
          ],
        },
      }),
    stop: () => Promise.resolve({ ok: true, value: undefined }),
  };
  const track: LocalTrack = {
    id: `12-slsk-${id}`,
    releaseId: 12,
    provider: 'soulseek',
    videoId: null,
    soulseek: { username: match.username, filename: match.filename, size: match.size },
    title: 'Quiet Orbit',
    sourceTitle: match.filename,
    trackIndex: 0,
    artist: 'Low Tide',
    album: loadedRelease.title,
    artworkUrl: null,
    filename: 'Quiet Orbit.slsk.mp3',
    warning: null,
  };
  let finishDownload: ((value: Awaited<ReturnType<AudioBridge['download']>>) => void) | undefined;
  const pendingDownload = new Promise<Awaited<ReturnType<AudioBridge['download']>>>((resolve) => {
    finishDownload = resolve;
  });
  const download = vi.fn<AudioBridge['download']>().mockReturnValue(pendingDownload);
  const release = {
    ...loadedRelease,
    tracks: [...loadedRelease.tracks, { position: 'B1', title: 'Night Tide', duration: '5:00' }],
  };
  const user = userEvent.setup();
  try {
    render(
      <App
        crate={{
          list: () => Promise.resolve({ ok: true, value: [release] }),
          save: vi.fn(),
          remove: vi.fn(),
        }}
        audioLibrary={{
          list: () => Promise.resolve({ ok: true, value: [] }),
          probe: vi.fn(),
          download,
          reveal: vi.fn(),
        }}
      />,
    );
    await user.click(await screen.findByRole('button', { name: 'Open Quiet Orbit EP' }));
    const sources = within(screen.getByRole('region', { name: 'Audio sources' }));
    expect(sources.getByRole('button', { name: 'YouTube', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(sources.getByRole('button', { name: 'Soulseek', exact: true }));
    expect(sources.getByRole('button', { name: 'Soulseek', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(sources.getByRole('combobox', { name: 'Soulseek track' })).toHaveDisplayValue(
      'A1 · Quiet Orbit',
    );
    const table = await screen.findByRole('table', { name: 'Soulseek search results' });
    expect(within(table).getByRole('columnheader', { name: 'Quality' })).toBeVisible();
    expect(within(table).queryByText('private_peer')).not.toBeInTheDocument();
    await user.clear(screen.getByRole('textbox', { name: 'Refine Soulseek search' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Refine Soulseek search' }),
      'Björk / Jóga (Live)!',
    );
    await user.click(screen.getByRole('button', { name: 'Search Soulseek' }));
    expect(search).toHaveBeenLastCalledWith('Björk Jóga Live');
    await user.click(
      await screen.findByRole('button', { name: 'Download Quiet Orbit.mp3 from peer' }),
    );
    expect(download).toHaveBeenCalledWith({
      provider: 'soulseek',
      candidateId: id,
      release,
      trackIndex: 0,
    });
    await user.selectOptions(sources.getByRole('combobox', { name: 'Soulseek track' }), '1');
    expect(await screen.findByRole('textbox', { name: 'Refine Soulseek search' })).toHaveValue(
      'Low Tide Night Tide',
    );
    await act(async () => {
      finishDownload?.({ ok: true, value: track });
      await pendingDownload;
    });
    expect(screen.getByRole('textbox', { name: 'Refine Soulseek search' })).toHaveValue(
      'Low Tide Night Tide',
    );
    await user.selectOptions(sources.getByRole('combobox', { name: 'Soulseek track' }), '0');
    expect(await screen.findByText('Saved from Soulseek')).toBeVisible();
    await user.click(sources.getByRole('button', { name: 'YouTube', exact: true }));
    expect(
      screen.queryByRole('table', { name: 'Soulseek search results' }),
    ).not.toBeInTheDocument();
  } finally {
    delete window.soulseek;
  }
});
