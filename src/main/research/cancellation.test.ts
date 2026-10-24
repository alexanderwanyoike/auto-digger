import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, vi } from 'vitest';
import { identityResponse, releaseResponse } from '../../../tests/discogsFixtures';
import { createCatalogueStore } from '../catalogue/store';
import { createTokenStore } from '../credentials/tokenStore';
import { createDiscogsSession } from '../discogs/session';
import { createRememberedSession } from '../discogs/rememberedSession';
import { createResearchService } from './service';

test('revocation aborts the active Discogs request and prevents queued research from contacting Discogs', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-research-cancel-'));
  const catalogue = createCatalogueStore(join(directory, 'catalog.sqlite'));
  const signals: (AbortSignal | null | undefined)[] = [];
  const finish: (() => void)[] = [];
  let cleaning = false;
  const request = vi.fn<typeof fetch>((input, init) => {
    const url = input instanceof Request ? input.url : input.toString();
    const value = url.endsWith('/oauth/identity') ? identityResponse : releaseResponse;
    if (url.endsWith('/oauth/identity') || cleaning)
      return Promise.resolve(new Response(JSON.stringify(value)));
    signals.push(init?.signal);
    return new Promise((resolveRequest, reject) => {
      finish.push(() => resolveRequest(new Response(JSON.stringify(value))));
      init?.signal?.addEventListener(
        'abort',
        () => reject(new DOMException('Cancelled', 'AbortError')),
        { once: true },
      );
    });
  });
  const tokens = createTokenStore(join(directory, 'token.bin'), {
    available: () => Promise.resolve(true),
    encrypt: () => Promise.resolve(Buffer.from('synthetic-test-ciphertext')),
    decrypt: () => Promise.resolve({ result: 'fixture-token', shouldReEncrypt: false }),
  });
  const session = createRememberedSession(createDiscogsSession(request), tokens);
  const service = createResearchService(catalogue, session, vi.fn());
  const pending: Promise<unknown>[] = [];
  try {
    await session.connect('fixture-token');
    const controller = new AbortController();
    pending.push(
      service.execute({ name: 'get_release', arguments: { releaseId: 12 } }, controller.signal),
    );
    pending.push(
      service.execute(
        { name: 'search_releases', arguments: { query: 'Quiet Orbit' } },
        controller.signal,
      ),
    );
    await vi.waitFor(() => expect(signals).toHaveLength(1));
    controller.abort();
    expect(signals[0]?.aborted).toBe(true);
    expect(await Promise.all(pending)).toMatchObject([
      { ok: false, error: { code: 'cancelled' } },
      { ok: false, error: { code: 'cancelled' } },
    ]);
    await new Promise<void>((resolveTick) => {
      setImmediate(resolveTick);
    });
    expect(request).toHaveBeenCalledTimes(2);
    expect(await session.account()).toMatchObject({ ok: true, value: identityResponse });
  } finally {
    cleaning = true;
    finish.forEach((resolveRequest) => resolveRequest());
    await Promise.allSettled(pending);
    await catalogue.close();
    await rm(directory, { recursive: true, force: true });
  }
});
