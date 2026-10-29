import { expect, test, vi } from 'vitest';
import { createCosineService } from './service';

function timedSignal(milliseconds: number) {
  const controller = new AbortController();
  setTimeout(() => {
    controller.abort(new DOMException('Request timed out', 'TimeoutError'));
  }, milliseconds);
  return controller.signal;
}

test('allows a slow Cosine recommendation response to finish beyond fifteen seconds', async () => {
  vi.useFakeTimers();
  vi.spyOn(AbortSignal, 'timeout').mockImplementation(timedSignal);
  const request = vi.fn<typeof fetch>().mockImplementation((input, init) => {
    const url = typeof input === 'string' ? input : '';
    if (url.includes('/lookup?'))
      return Promise.resolve(
        Response.json({
          success: true,
          data: [{ id: '1', artist: 'Low Tide', track: 'Quiet Orbit' }],
        }),
      );
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        resolve(
          Response.json({
            success: true,
            data: { similar_tracks: [{ id: '2', artist: 'Still Waters', track: 'Later Orbit' }] },
          }),
        );
      }, 18000);
      init?.signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          reject(init.signal?.reason);
        },
        { once: true },
      );
    });
  });
  try {
    const pending = createCosineService(
      {
        load: vi.fn().mockResolvedValue({ ok: true, value: 'private-key' }),
        save: vi.fn(),
        clear: vi.fn(),
      },
      request,
    ).similar({ url: 'https://youtu.be/abcdefghijk' });
    await vi.advanceTimersByTimeAsync(18000);
    expect(await pending).toMatchObject({ ok: true, value: { tracks: [{ id: '2' }] } });
  } finally {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  }
});
