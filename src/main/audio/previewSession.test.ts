import { expect, test, vi } from 'vitest';
import { createPreviewSession } from './previewSession';
import { loadedRelease } from '../../../tests/discogsFixtures';
import type { ResolvedPreview } from './previewResolver';
import type { AudioResult } from '../../shared/audio';

const source: ResolvedPreview = {
  videoId: 'abcdefghijk',
  title: 'Low Tide - Quiet Orbit',
  url: 'https://r1.googlevideo.com/audio',
  headers: { 'User-Agent': 'yt-dlp' },
};
test('proxies a revocable preview progressively, forwarding range requests without exposing the media URL', async () => {
  let finish: () => void = () => {
    throw new Error('Stream not open');
  };
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2]));
      finish = () => {
        controller.enqueue(new Uint8Array([3, 4]));
        controller.close();
      };
    },
  });
  const fetchMedia = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(body, {
      status: 206,
      headers: {
        'Content-Type': 'audio/webm',
        'Content-Range': 'bytes 0-3/4',
        'Accept-Ranges': 'bytes',
      },
    }),
  );
  const session = createPreviewSession(
    () => Promise.resolve({ ok: true, value: source }),
    fetchMedia,
  );
  const started = await session.start({ release: loadedRelease, videoIndex: 0 });
  expect(started).toMatchObject({ ok: true, value: { title: 'Quiet Orbit', source: 'preview' } });
  if (!started.ok) throw new Error('Preview unavailable');
  expect(started.value.url).not.toContain('googlevideo.com');
  const response = await session.serve(
    new Request(started.value.url, { headers: { Range: 'bytes=0-3' } }),
  );
  expect(response.status).toBe(206);
  const reader = response.body?.getReader();
  expect(await reader?.read()).toEqual({ done: false, value: new Uint8Array([1, 2]) });
  finish();
  expect(await reader?.read()).toEqual({ done: false, value: new Uint8Array([3, 4]) });
  expect(fetchMedia.mock.calls[0]?.[1]?.headers).toMatchObject({ Range: 'bytes=0-3' });
  expect(session.stop()).toEqual({ ok: true, value: undefined });
  expect((await session.serve(new Request(started.value.url))).status).toBe(404);
});

test('ignores a replaced source resolution and aborts active streams when stopped', async () => {
  let resolveSource: (value: AudioResult<ResolvedPreview>) => void = () => {
    throw new Error('not started');
  };
  const pending = new Promise<AudioResult<ResolvedPreview>>((resolve) => {
    resolveSource = resolve;
  });
  const session = createPreviewSession(() => pending);
  const started = session.start({ release: loadedRelease, videoIndex: 0 });
  session.stop();
  resolveSource({ ok: true, value: source });
  expect(await started).toMatchObject({ ok: false });
});

test('keeps a long mix seekable beyond one hour while respecting source expiry', async () => {
  const now = Date.now();
  const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
  const session = createPreviewSession(
    () => Promise.resolve({ ok: true, value: source }),
    () => Promise.resolve(new Response(new Uint8Array([1]))),
  );
  const started = await session.start({ release: loadedRelease, videoIndex: 0 });
  if (!started.ok) throw new Error('Expected preview');
  clock.mockReturnValue(now + 2 * 60 * 60 * 1000);
  expect((await session.serve(new Request(started.value.url))).status).toBe(200);
  clock.mockReturnValue(now + 7 * 60 * 60 * 1000);
  expect((await session.serve(new Request(started.value.url))).status).toBe(404);
});

test('revokes an already open preview stream when its session expires', async () => {
  vi.useFakeTimers();
  const fetchMedia = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([1]));
        },
      }),
    ),
  );
  const session = createPreviewSession(
    () => Promise.resolve({ ok: true, value: source }),
    fetchMedia,
  );
  try {
    const started = await session.start({ release: loadedRelease, videoIndex: 0 });
    if (!started.ok) throw new Error('Expected preview');
    await session.serve(new Request(started.value.url));
    const signal = fetchMedia.mock.calls[0]?.[1]?.signal;
    expect(signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(6 * 60 * 60 * 1000);
    expect(signal?.aborted).toBe(true);
    expect((await session.serve(new Request(started.value.url))).status).toBe(404);
  } finally {
    session.stop();
    vi.useRealTimers();
  }
});
