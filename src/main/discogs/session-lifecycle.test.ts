import { expect, test, vi } from 'vitest';
import { identityResponse, releaseResponse } from '../../../tests/discogs-fixtures';
import { createDiscogsSession } from './session';

test('disconnect clears the account and prevents further release requests', async () => {
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(JSON.stringify(identityResponse)));
  const session = createDiscogsSession(request);
  await session.connect('token');
  expect(session.disconnect()).toEqual({ ok: true, value: undefined });
  expect(session.account()).toEqual({ ok: true, value: null });
  const result = await session.loadRelease(12);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error.code).toBe('unauthorized');
  expect(request).toHaveBeenCalledTimes(1);
});

test.each([0, -1, 1.5, Number.NaN, '12', null])(
  'rejects invalid release ID %s before HTTP',
  async (id) => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(identityResponse)));
    const session = createDiscogsSession(request);
    await session.connect('token');
    const result = await session.loadRelease(id);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid-input');
    expect(request).toHaveBeenCalledTimes(1);
  },
);

test('a late connection cannot restore a disconnected session', async () => {
  let finish: ((response: Response) => void) | undefined;
  const request = vi.fn<typeof fetch>().mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const session = createDiscogsSession(request);
  const connecting = session.connect('token');
  session.disconnect();
  finish?.(new Response(JSON.stringify(identityResponse)));
  const result = await connecting;
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error.code).toBe('cancelled');
  expect(session.account()).toEqual({ ok: true, value: null });
});

test('token rejection during lookup clears the session', async () => {
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response(JSON.stringify(identityResponse)))
    .mockResolvedValueOnce(new Response('{}', { status: 401 }));
  const session = createDiscogsSession(request);
  await session.connect('token');
  const result = await session.loadRelease(12);
  expect(result.ok).toBe(false);
  expect(session.account()).toEqual({ ok: true, value: null });
  await session.loadRelease(12);
  expect(request).toHaveBeenCalledTimes(2);
});

test('a release completing after disconnect is discarded', async () => {
  let finish: ((response: Response) => void) | undefined;
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response(JSON.stringify(identityResponse)))
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
  const session = createDiscogsSession(request);
  await session.connect('token');
  const loading = session.loadRelease(12);
  session.disconnect();
  finish?.(new Response(JSON.stringify(releaseResponse)));
  const result = await loading;
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error.code).toBe('cancelled');
});
