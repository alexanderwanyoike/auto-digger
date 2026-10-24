import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, vi } from 'vitest';
import { createTokenStore } from './tokenStore';

test('remembers only encrypted bytes, restores the token and forgets it', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-credentials-'));
  const encryption = {
    available: () => Promise.resolve(true),
    encrypt: vi.fn<(token: string) => Promise<Buffer>>().mockResolvedValue(Buffer.from([9, 8, 7])),
    decrypt: vi
      .fn<(cipher: Buffer) => Promise<{ result: string; shouldReEncrypt: boolean }>>()
      .mockResolvedValue({ result: 'private-token', shouldReEncrypt: false }),
  };
  try {
    const path = join(directory, 'token.bin');
    const store = createTokenStore(path, encryption);
    expect(await store.load()).toEqual({ ok: true, value: null });
    expect(await store.save('private-token')).toEqual({ ok: true, value: undefined });
    expect(await readFile(path)).toEqual(Buffer.from([9, 8, 7]));
    expect(await createTokenStore(path, encryption).load()).toEqual({
      ok: true,
      value: 'private-token',
    });
    expect(await store.clear()).toEqual({ ok: true, value: undefined });
    expect(await store.load()).toEqual({ ok: true, value: null });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
