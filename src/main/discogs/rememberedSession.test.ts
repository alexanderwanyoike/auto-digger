import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, vi } from 'vitest';
import { createTokenStore } from '../credentials/tokenStore';
import { createDiscogsSession } from './session';
import { createRememberedSession } from './rememberedSession';
import { identityResponse } from '../../../tests/discogsFixtures';

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
