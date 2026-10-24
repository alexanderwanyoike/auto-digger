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
      '--format',
      'bestaudio/best',
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

test('forwards abort signals and structured progress through the downloader boundary', async () => {
  const abort = new AbortController();
  const updates: unknown[] = [];
  const execute = vi.fn(
    (_args: string[], _timeout: number, signal?: AbortSignal, output?: (line: string) => void) => {
      expect(signal).toBe(abort.signal);
      output?.('AD_PROGRESS:{"downloaded_bytes":50,"total_bytes":100}');
      output?.('AD_POSTPROCESS:"started"');
      return Promise.resolve({ ok: true as const, value: '' });
    },
  );
  const downloader = createDownloader(execute);
  expect(
    await downloader.download('abcdefghijk', '/tmp/audio.mp3', {
      signal: abort.signal,
      onProgress: (progress) => {
        updates.push(progress);
      },
    }),
  ).toMatchObject({ ok: true });
  expect(updates).toMatchObject([
    { stage: 'downloading', percent: 50 },
    { stage: 'converting', percent: null },
  ]);
  expect(execute.mock.calls[0]?.[0]).toContain('--progress-template');
});
