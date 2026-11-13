import { _electron as electron, expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { loadedRelease } from '../discogs-fixtures';

test('downloads a liked track once, shares it with a playlist and restores both after restart', async () => {
  test.setTimeout(45_000);
  const options = {
    args: [
      resolve('tests/encrypted-desktop.cjs'),
      `--user-data-dir=${test.info().outputPath('profile')}`,
    ],
  };
  let desktop = await electron.launch(options);
  try {
    let page = await desktop.firstWindow();
    await page.getByRole('heading', { name: 'Explore' }).waitFor();
    await page.evaluate(async (record) => window.crate?.save(record), {
      ...loadedRelease,
      videos: [
        ...loadedRelease.videos,
        { title: 'Low Tide - Night Signal', url: 'https://www.youtube.com/watch?v=zyxwvutsrqp' },
      ],
      tracks: [
        ...loadedRelease.tracks,
        { position: 'B1', title: 'Night Signal', duration: '' },
        { position: 'B2', title: 'No attached audio', duration: '' },
      ],
    });
    await page.reload();
    await page.getByRole('button', { name: 'Playlists', exact: true }).click({ timeout: 5000 });
    const topGap = async () =>
      page.locator('.playlist-page').evaluate((section) => {
        const header = document.querySelector('.app-header');
        return section.getBoundingClientRect().top - (header?.getBoundingClientRect().bottom ?? 0);
      });
    expect(await topGap()).toBe(12);
    await page.getByLabel('New playlist name', { exact: true }).fill('After hours');
    await page.getByRole('button', { name: 'Create playlist', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'After hours', exact: true })).toBeVisible();
    expect(await topGap()).toBe(12);
    await page.getByRole('button', { name: 'Digging desk', exact: true }).click();
    await page.getByRole('button', { name: 'Open Quiet Orbit EP', exact: true }).click();
    const like = page.getByRole('button', { name: 'Like Quiet Orbit', exact: true });
    await like.click();
    await expect(like).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Like No attached audio', exact: true }).click();
    await page.getByRole('button', { name: 'Add Quiet Orbit to playlist', exact: true }).click();
    await page.getByRole('button', { name: 'Add to After hours', exact: true }).click();
    await page.getByRole('button', { name: 'Playlists', exact: true }).click();
    await page.getByRole('button', { name: 'Likes', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play Quiet Orbit', exact: true })).toBeEnabled();
    await expect(
      page.getByRole('button', { name: 'Choose audio for No attached audio', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'After hours', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play Quiet Orbit', exact: true })).toBeEnabled();
    await expect
      .poll(() => page.evaluate(async () => window.audioLibrary?.list()))
      .toMatchObject({
        ok: true,
        value: [{ id: '12-abcdefghijk' }],
      });
    expect(await page.evaluate(async () => window.downloadJobs?.list())).toMatchObject({
      ok: true,
      value: [{ sourceId: '12-abcdefghijk', stage: 'complete' }],
    });

    await desktop.close();
    desktop = await electron.launch(options);
    page = await desktop.firstWindow();
    await page.getByRole('button', { name: 'Playlists', exact: true }).click();
    await page.getByRole('button', { name: 'After hours', exact: true }).click();
    await page.getByRole('button', { name: 'Play Quiet Orbit', exact: true }).click();
    await expect(
      page
        .getByRole('contentinfo', { name: 'Playback' })
        .getByRole('button', { name: 'Pause', exact: true }),
    ).toBeEnabled();
    await page.getByRole('button', { name: 'Likes', exact: true }).click();
    await page.getByRole('button', { name: 'Remove Quiet Orbit from Likes', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play Quiet Orbit', exact: true })).toHaveCount(
      0,
    );
    await page.getByRole('button', { name: 'After hours', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play Quiet Orbit', exact: true })).toBeEnabled();

    await page.getByRole('button', { name: 'Digging desk', exact: true }).click();
    await page.getByRole('button', { name: 'Open Quiet Orbit EP', exact: true }).click();
    await page.getByRole('button', { name: 'Add Night Signal to playlist', exact: true }).click();
    await page.getByRole('button', { name: 'Add to After hours', exact: true }).click();
    await page.getByRole('button', { name: 'Playlists', exact: true }).click();
    await page.getByRole('button', { name: 'After hours', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Play Night Signal', exact: true }),
    ).toBeEnabled();
    const transport = page.getByRole('contentinfo', { name: 'Playback' });
    await page.getByRole('button', { name: 'Play playlist', exact: true }).click({ timeout: 3000 });
    await expect(transport.getByText('Quiet Orbit', { exact: true })).toBeVisible();
    await expect(transport.getByText('Night Signal', { exact: true })).toBeVisible({
      timeout: 18000,
    });
    await page.evaluate(() => {
      Math.random = () => 0;
    });
    await page.getByRole('button', { name: 'Shuffle playlist', exact: true }).click();
    await expect(transport.getByText('Night Signal', { exact: true })).toBeVisible();
    await expect(transport.getByText('Quiet Orbit', { exact: true })).toBeVisible({
      timeout: 18_000,
    });
    await page.getByRole('button', { name: 'Likes', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play playlist', exact: true })).toBeDisabled();
  } finally {
    await desktop.close();
  }
});

test('preserves a downloaded upload assigned to a different liked track', async () => {
  const desktop = await electron.launch({
    args: [
      resolve('tests/encrypted-desktop.cjs'),
      `--user-data-dir=${test.info().outputPath('profile')}`,
    ],
  });
  try {
    const page = await desktop.firstWindow();
    const record = {
      ...loadedRelease,
      tracks: [...loadedRelease.tracks, { position: 'B1', title: 'Night Signal', duration: '' }],
    };
    const saved = await page.evaluate(async (release) => {
      const crate = await window.crate?.save(release);
      const audio = await window.audioLibrary?.download({ release, videoIndex: 0, trackIndex: 1 });
      return crate?.ok && audio?.ok;
    }, record);
    expect(saved).toBe(true);
    await page.reload();
    await page.getByRole('button', { name: 'Digging desk', exact: true }).click();
    await page.getByRole('button', { name: 'Open Quiet Orbit EP', exact: true }).click();
    await page.getByRole('button', { name: 'Like Night Signal', exact: true }).click();
    const like = page.getByRole('button', { name: 'Like Quiet Orbit', exact: true });
    await like.click();
    await expect(like).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Playlists', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Choose audio for Quiet Orbit' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Play Night Signal' })).toBeVisible();
  } finally {
    await desktop.close();
  }
});

test('recognises Likes when Discogs adds a preceding track to the same release', async () => {
  const desktop = await electron.launch({
    args: [
      resolve('tests/encrypted-desktop.cjs'),
      `--user-data-dir=${test.info().outputPath('profile')}`,
    ],
  });
  try {
    const page = await desktop.firstWindow();
    await page.getByRole('heading', { name: 'Explore' }).waitFor();
    const stored = await page.evaluate(async (release) => {
      const liked = await window.playlists?.add({
        playlistId: 'likes',
        track: { release, trackIndex: 0 },
      });
      const updated = {
        ...release,
        tracks: [{ position: 'Intro', title: 'Intro', duration: '' }, ...release.tracks],
      };
      const crate = await window.crate?.save(updated);
      const audio = await window.audioLibrary?.download({ release, videoIndex: 0, trackIndex: 0 });
      return liked?.ok && crate?.ok && audio?.ok;
    }, loadedRelease);
    expect(stored).toBe(true);
    await page.reload();
    await page.getByRole('button', { name: 'Digging desk', exact: true }).click();
    await page.getByRole('button', { name: 'Open Quiet Orbit EP', exact: true }).click();
    const source = page.getByRole('region', { name: 'Audio sources' }).getByLabel('Discogs track');
    await expect(source).toHaveValue('1');
    await page.getByRole('button', { name: 'Playlists', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play Quiet Orbit', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Digging desk', exact: true }).click();
    const like = page.getByRole('button', { name: 'Like Quiet Orbit', exact: true });
    await expect(like).toHaveAttribute('aria-pressed', 'true');
    await like.click();
    await expect(like).toHaveAttribute('aria-pressed', 'false');
  } finally {
    await desktop.close();
  }
});

test('downloads a liked track using the verified YouTube title', async () => {
  const desktop = await electron.launch({
    args: [
      resolve('tests/encrypted-desktop.cjs'),
      `--user-data-dir=${test.info().outputPath('profile')}`,
    ],
  });
  try {
    const page = await desktop.firstWindow();
    await page.getByRole('heading', { name: 'Explore' }).waitFor();
    const saved = await page.evaluate((release) => window.crate?.save(release), {
      ...loadedRelease,
      videos: loadedRelease.videos.map((video) => ({ ...video, title: 'Record upload' })),
    });
    expect(saved?.ok).toBe(true);
    await page.reload();
    await page.getByRole('button', { name: 'Digging desk', exact: true }).click();
    await page.getByRole('button', { name: 'Open Quiet Orbit EP', exact: true }).click();
    await page.getByRole('button', { name: 'Like Quiet Orbit', exact: true }).click();
    await page.getByRole('button', { name: 'Playlists', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play Quiet Orbit' })).toBeVisible();
  } finally {
    await desktop.close();
  }
});

test('downloads distinct liked tracks that share the same title', async () => {
  const desktop = await electron.launch({
    args: [
      resolve('tests/encrypted-desktop.cjs'),
      `--user-data-dir=${test.info().outputPath('profile')}`,
    ],
  });
  try {
    const page = await desktop.firstWindow();
    await page.getByRole('heading', { name: 'Explore' }).waitFor();
    const saved = await page.evaluate((release) => window.crate?.save(release), {
      ...loadedRelease,
      tracks: [...loadedRelease.tracks, { position: 'B1', title: 'Quiet Orbit', duration: '' }],
      videos: [
        {
          title: 'Low Tide - Quiet Orbit',
          url: 'https://www.youtube.com/watch?v=abcdefghijk',
          cosineTrackIndex: 0,
        },
        {
          title: 'Low Tide - Night Signal',
          url: 'https://www.youtube.com/watch?v=zyxwvutsrqp',
          cosineTrackIndex: 1,
        },
      ],
    });
    expect(saved?.ok).toBe(true);
    await page.reload();
    await page.getByRole('button', { name: 'Digging desk', exact: true }).click();
    await page.getByRole('button', { name: 'Open Quiet Orbit EP', exact: true }).click();
    const likes = page.getByRole('button', { name: 'Like Quiet Orbit', exact: true });
    await likes.nth(0).click();
    await expect
      .poll(() => page.evaluate(() => window.audioLibrary?.list()))
      .toMatchObject({ ok: true, value: [{ trackIndex: 0 }] });
    await likes.nth(1).click();
    await page.getByRole('button', { name: 'Playlists', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play Quiet Orbit', exact: true })).toHaveCount(
      2,
    );
  } finally {
    await desktop.close();
  }
});
