import { expect, test, vi } from 'vitest';
import { createCosineService } from './service';
import { createCosineRequest } from './request';
import { lookupSchema } from './response';

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

test('reports an expired Cosine deadline as a timeout without blaming the local connection', async () => {
  vi.useFakeTimers();
  vi.spyOn(AbortSignal, 'timeout').mockImplementation(timedSignal);
  const request = vi.fn<typeof fetch>().mockImplementation(
    (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener(
          'abort',
          () => {
            const reason: unknown = init.signal?.reason;
            reject(reason);
          },
          { once: true },
        );
      }),
  );
  try {
    let settled = false;
    const pending = createCosineRequest('private-key', request)('search?q=track', lookupSchema);
    pending
      .then(() => {
        settled = true;
      })
      .catch(() => undefined);
    await vi.advanceTimersByTimeAsync(44000);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1000);
    const result = await pending;
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'timeout', message: 'Cosine took too long to respond. Please try again.' },
    });
    expect(JSON.stringify(result)).not.toContain('private-key');
  } finally {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  }
});

test.each([
  {
    name: 'invalid JSON',
    request: () => Promise.resolve(new Response('<html>Busy upstream</html>')),
    code: 'invalid-response',
  },
  {
    name: 'connection failure',
    request: () => Promise.reject(new TypeError('Connection failed private-key')),
    code: 'network',
  },
])('distinguishes $name without leaking provider details', async ({ request, code }) => {
  const result = await createCosineRequest('private-key', request)('search?q=track', lookupSchema);
  expect(result).toMatchObject({ ok: false, error: { code } });
  expect(JSON.stringify(result)).not.toContain('private-key');
});
