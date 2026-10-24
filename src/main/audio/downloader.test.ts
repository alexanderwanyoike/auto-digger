import { expect, test, vi } from 'vitest';
import { createDownloader } from './downloader';

test('checks a YouTube source then extracts a single MP3 using fixed safe arguments', async () => {
  const execute = vi.fn().mockResolvedValue({
    ok: true,
    value: JSON.stringify({ id: 'abcdefghijk', title: 'Low Tide - Quiet Orbit', is_live: false }),
  });
  const downloader = createDownloader(execute);
  expect(await downloader.probe('https://youtu.be/abcdefghijk')).toEqual({
    ok: true,
    value: { videoId: 'abcdefghijk', title: 'Low Tide - Quiet Orbit' },
  });
  expect(await downloader.download('abcdefghijk', '/tmp/track.mp3')).toEqual({
    ok: true,
    value: undefined,
  });
  expect(execute.mock.calls[0]?.[0]).toEqual(
    expect.arrayContaining([
      '--js-runtimes',
      'node',
      '--ignore-config',
      '--no-playlist',
      '--dump-single-json',
      'https://www.youtube.com/watch?v=abcdefghijk',
    ]),
  );
  expect(execute.mock.calls[1]?.[0]).toEqual(
    expect.arrayContaining([
      '--extract-audio',
      '--audio-format',
      'mp3',
      '--output',
      '/tmp/track.%(ext)s',
    ]),
  );
  execute.mockClear();
  expect(await downloader.probe('https://example.com/attack')).toMatchObject({
    ok: false,
    error: { code: 'invalid-input' },
  });
  expect(execute).not.toHaveBeenCalled();
});
