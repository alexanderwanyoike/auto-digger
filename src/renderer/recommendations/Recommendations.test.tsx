import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { loadedRelease, identityResponse } from '../../../tests/discogs-fixtures';
import { App } from '../App';

test('connects Cosine then previews and opens recommendations in the desk, preserving the source EP and filters', async () => {
  let configured = false;
  const item = {
    id: '2',
    artist: 'Still Waters',
    title: 'Later Orbit (Club Mix)',
    releaseId: 13,
    youtubeUrl: 'https://www.youtube.com/watch?v=lmnopqrstuv',
  };
  const related = {
    ...loadedRelease,
    id: 13,
    title: 'Later EP',
    artists: ['Still Waters'],
    tracks: [{ position: 'A1', title: item.title, duration: '6:00' }],
    videos: [{ title: 'Still Waters - ' + item.title, url: item.youtubeUrl, cosineTrackIndex: 0 }],
  };
  const similar = vi
    .fn()
    .mockResolvedValue({
      ok: true,
      value: {
        seed: { ...item, id: '1', artist: 'Low Tide', title: 'Quiet Orbit' },
        tracks: [item],
      },
    });
  const resolve = vi
    .fn()
    .mockResolvedValue({ ok: true, value: { release: related, trackIndex: 0, videoIndex: 0 } });
  Reflect.set(window, 'cosine', {
    status: () => Promise.resolve({ ok: true, value: { configured } }),
    saveKey: () => {
      configured = true;
      return Promise.resolve({ ok: true, value: { configured } });
    },
    forget: vi.fn(),
    similar,
    resolve,
  });
  const prepare = vi
    .fn()
    .mockResolvedValue({
      ok: true,
      value: {
        id: '13-lmnopqrstuv',
        releaseId: 13,
        videoId: 'lmnopqrstuv',
        title: item.title,
        sourceTitle: item.title,
        trackIndex: 0,
        artist: item.artist,
        album: 'Later EP',
        artworkUrl: null,
        filename: 'Later.yt.mp3',
        warning: null,
      },
    });
  Reflect.set(window, 'audioPreviews', { prepare, cancel: vi.fn() });
  const user = userEvent.setup();
  try {
    render(
      <App
        discogs={{
          account: () => Promise.resolve({ ok: true, value: identityResponse }),
          connect: vi.fn(),
          disconnect: vi.fn(),
          openSettings: vi.fn(),
          dig: vi.fn(),
          search: vi.fn(),
          loadRelease: vi.fn(),
        }}
        crate={{
          list: () => Promise.resolve({ ok: true, value: [loadedRelease] }),
          save: vi.fn(),
          remove: vi.fn(),
        }}
        audioLibrary={{
          list: () => Promise.resolve({ ok: true, value: [] }),
          probe: () =>
            Promise.resolve({
              ok: true,
              value: { videoId: 'abcdefghijk', title: 'Low Tide Quiet Orbit' },
            }),
          download: vi.fn(),
          reveal: vi.fn(),
        }}
      />,
    );
    await screen.findByRole('button', { name: 'Connected as quiet-digger' });
    await user.type(screen.getByLabelText('Label'), 'Keep this label');
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const settings = await screen.findByRole('region', { name: 'Cosine Club settings' });
    await user.type(within(settings).getByLabelText('Cosine Club API key'), 'test-secret');
    await user.click(within(settings).getByRole('button', { name: 'Save Cosine key' }));
    expect(await within(settings).findByText('Cosine key saved.')).toBeVisible();
    expect(within(settings).getByLabelText('Cosine Club API key')).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'Digging desk' }));
    await user.click(await screen.findByRole('button', { name: 'Open Quiet Orbit EP' }));
    await user.click(await screen.findByRole('button', { name: 'Find similar to Quiet Orbit' }));
    const results = await screen.findByRole('region', { name: 'Recommendations' });
    expect(await within(results).findByText(item.title)).toBeVisible();
    await user.type(within(results).getByLabelText('From year'), '2000');
    await user.type(within(results).getByLabelText('To year'), '2010');
    await user.click(within(results).getByRole('button', { name: 'Refresh recommendations' }));
    expect(similar).toHaveBeenLastCalledWith({
      url: loadedRelease.videos[0]?.url,
      fromYear: 2000,
      toYear: 2010,
    });
    await user.click(within(results).getByRole('button', { name: 'Preview ' + item.title }));
    expect(prepare).toHaveBeenCalledWith({ release: related, videoIndex: 0, trackIndex: 0 });
    await user.click(
      within(results).getByRole('button', { name: 'Open release for ' + item.title }),
    );
    expect(await screen.findByRole('heading', { name: 'Later EP' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Back to recommendations' }));
    expect(await within(results).findByText(item.title)).toBeVisible();
    expect(within(results).getByLabelText('From year')).toHaveValue(2000);
    expect(similar).toHaveBeenCalledTimes(2);
    await user.click(within(results).getByRole('button', { name: 'Back to Quiet Orbit EP' }));
    expect(await screen.findByRole('heading', { name: 'Quiet Orbit EP' })).toBeVisible();
    expect(screen.getByLabelText('Label')).toHaveValue('Keep this label');
  } finally {
    Reflect.deleteProperty(window, 'cosine');
    Reflect.deleteProperty(window, 'audioPreviews');
  }
});
