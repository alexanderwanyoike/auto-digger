import { expect, test, vi } from 'vitest';
import { createPreviewResolver } from './previewResolver';
import type { Execute } from './downloader';

test('resolves a single audio stream without saving media and rejects untrusted destinations', async () => {
  const execute = vi
    .fn<Execute>()
    .mockResolvedValue({
      ok: true,
      value: JSON.stringify({
        id: 'abcdefghijk',
        title: 'Quiet Orbit',
        url: 'https://r1.googlevideo.com/videoplayback?expire=123',
        http_headers: { 'User-Agent': 'yt-dlp', Cookie: 'must-stay-out' },
        is_live: false,
      }),
    });
  const resolve = createPreviewResolver(execute);
  expect(await resolve('https://youtu.be/abcdefghijk')).toEqual({
    ok: true,
    value: {
      videoId: 'abcdefghijk',
      title: 'Quiet Orbit',
      url: 'https://r1.googlevideo.com/videoplayback?expire=123',
      headers: { 'User-Agent': 'yt-dlp' },
    },
  });
  expect(execute.mock.calls[0]?.[0]).toEqual(
    expect.arrayContaining(['--skip-download', '--format', 'bestaudio[ext=webm]/bestaudio']),
  );
  expect(execute.mock.calls[0]?.[0]).not.toContain('--extract-audio');
  execute.mockResolvedValue({
    ok: true,
    value: JSON.stringify({
      id: 'abcdefghijk',
      title: 'Quiet Orbit',
      url: 'https://googlevideo.com.evil.example/private',
    }),
  });
  expect(await resolve('https://youtu.be/abcdefghijk')).toMatchObject({
    ok: false,
    error: { code: 'unavailable' },
  });
  execute.mockClear();
  expect(await resolve('file:///etc/passwd')).toMatchObject({
    ok: false,
    error: { code: 'invalid-input' },
  });
  expect(execute).not.toHaveBeenCalled();
});
