import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, vi } from 'vitest';
import { createTokenStore } from '../credentials/token-store';
import { createDiscogsSession } from './session';
import { createRememberedSession } from './remembered-session';
import { identityResponse, releaseResponse } from '../../../tests/discogs-fixtures';

const encryption = {
  available: () => Promise.resolve(true),
  encrypt: () => Promise.resolve(Buffer.from('encrypted-fixture')),
  decrypt: () => Promise.resolve({ result: 'remember-me', shouldReEncrypt: false }),
};
test('restores a verified account in a fresh session and removes its token on disconnect', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-remember-'));
  try {
    const store = createTokenStore(join(directory, 'token.bin'), encryption);
    const request = vi
      .fn<typeof fetch>()
      .mockImplementation(() => Promise.resolve(new Response(JSON.stringify(identityResponse))));
    const first = createRememberedSession(createDiscogsSession(request), store);
    expect(await first.connect(' remember-me ')).toEqual({ ok: true, value: identityResponse });
    const reopened = createRememberedSession(createDiscogsSession(request), store);
    expect(await reopened.account()).toEqual({ ok: true, value: identityResponse });
    expect(request).toHaveBeenCalledTimes(2);
    expect(new Headers(request.mock.calls[1]?.[1]?.headers).get('Authorization')).toBe(
      'Discogs token=remember-me',
    );
    expect(JSON.stringify(await reopened.account())).not.toContain('remember-me');
    expect(await reopened.disconnect()).toEqual({ ok: true, value: undefined });
    expect(await createRememberedSession(createDiscogsSession(request), store).account()).toEqual({
      ok: true,
      value: null,
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test.each([
  [401, 'unauthorized', null],
  [503, 'network', 'remember-me'],
] as const)(
  'handles restored-token HTTP %s without losing retryable credentials',
  async (status, code, remaining) => {
    const directory = await mkdtemp(join(tmpdir(), 'auto-remember-'));
    try {
      const store = createTokenStore(join(directory, 'token.bin'), encryption);
      await store.save('remember-me');
      const request = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status }));
      const session = createRememberedSession(createDiscogsSession(request), store);
      expect(await session.account()).toMatchObject({ ok: false, error: { code } });
      expect(await store.load()).toEqual({ ok: true, value: remaining });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);

test.each(['loadRelease', 'search', 'dig'] as const)(
  'forgets a remembered token rejected during %s',
  async (operation) => {
    const directory = await mkdtemp(join(tmpdir(), 'auto-remember-'));
    try {
      const store = createTokenStore(join(directory, 'token.bin'), encryption);
      const request = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(new Response(JSON.stringify(identityResponse)))
        .mockResolvedValueOnce(new Response('{}', { status: 401 }));
      const session = createRememberedSession(createDiscogsSession(request), store);
      await session.connect('remember-me');
      const operations = {
        loadRelease: () => session.loadRelease(12),
        search: () => session.search({ filters: {}, page: 1 }),
        dig: () => session.dig({ filters: {} }),
      };
      expect(await operations[operation]()).toMatchObject({
        ok: false,
        error: { code: 'unauthorized' },
      });
      expect(await store.load()).toEqual({ ok: true, value: null });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);

test('runs a waiting release before queued background searches', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-priority-'));
  try {
    let finish: ((response: Response) => void) | undefined;
    const emptyPage = () =>
      Response.json({
        pagination: { page: 1, pages: 0, per_page: 50, items: 0 },
        results: [],
      });
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(identityResponse))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockImplementation((input) => {
        const path = new URL(input instanceof Request ? input.url : input.toString()).pathname;
        return Promise.resolve(
          path === '/releases/12' ? Response.json(releaseResponse) : emptyPage(),
        );
      });
    const session = createRememberedSession(
      createDiscogsSession(request),
      createTokenStore(join(directory, 'token.bin'), encryption),
    );
    await session.connect('remember-me');
    const background = { context: 'catalogue', background: true, filters: {}, page: 1 };
    const first = session.search(background);
    await vi.waitFor(() => {
      expect(request).toHaveBeenCalledTimes(2);
    });
    const next = session.search({ ...background, page: 2 });
    const selected = session.loadRelease(12);
    finish?.(emptyPage());
    await Promise.all([first, next, selected]);
    expect(request.mock.calls[2]?.[0]).toBe('https://api.discogs.com/releases/12');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
