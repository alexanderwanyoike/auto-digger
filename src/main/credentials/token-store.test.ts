import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, vi } from 'vitest';
import { createTokenStore } from './token-store';

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

test('preserves the previous credential when encryption fails and never leaks errors', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-credentials-'));
  const encryption = {
    available: () => Promise.resolve(true),
    encrypt: vi
      .fn<(token: string) => Promise<Buffer>>()
      .mockResolvedValueOnce(Buffer.from([1, 2, 3]))
      .mockRejectedValueOnce(new Error('private-token')),
    decrypt: () => Promise.resolve({ result: 'old-token', shouldReEncrypt: false }),
  };
  try {
    const path = join(directory, 'token.bin');
    const store = createTokenStore(path, encryption);
    await store.save('old-token');
    const result = await store.save('private-token');
    expect(result).toMatchObject({ ok: false, error: { code: 'credential-storage' } });
    expect(JSON.stringify(result)).not.toContain('private-token');
    expect(await readFile(path)).toEqual(Buffer.from([1, 2, 3]));
    expect(await store.load()).toEqual({ ok: true, value: 'old-token' });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('can forget an encrypted token even when the keyring is unavailable', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-credentials-'));
  const available = vi
    .fn<() => Promise<boolean>>()
    .mockResolvedValueOnce(true)
    .mockResolvedValue(false);
  const encryption = {
    available,
    encrypt: () => Promise.resolve(Buffer.from([1, 2, 3])),
    decrypt: () => Promise.resolve({ result: 'token', shouldReEncrypt: false }),
  };
  try {
    const path = join(directory, 'token.bin');
    const store = createTokenStore(path, encryption);
    await store.save('token');
    expect(await store.load()).toMatchObject({ ok: false, error: { code: 'credential-storage' } });
    expect(await readFile(path)).toEqual(Buffer.from([1, 2, 3]));
    expect(await store.clear()).toEqual({ ok: true, value: undefined });
    expect(await store.load()).toEqual({ ok: true, value: null });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
