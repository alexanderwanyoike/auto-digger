import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { createSoulseekSettings } from './settings';

test('remembers encrypted connection settings without returning the API key to the renderer', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-connection-'));
  let secret = '';
  const encryption = {
    available: () => Promise.resolve(true),
    encrypt: (value: string) => {
      secret = value;
      return Promise.resolve(Buffer.from('ciphertext'));
    },
    decrypt: () => Promise.resolve({ result: secret, shouldReEncrypt: false }),
  };
  const request: typeof fetch = () => Promise.resolve(new Response('[]'));
  const file = join(directory, 'slskd.bin');
  const settings = createSoulseekSettings(file, encryption, request);
  try {
    const result = await settings.configure({
      url: 'http://127.0.0.1:5030',
      directory,
      apiKey: 'private-test-key',
    });
    expect(result).toEqual({
      ok: true,
      value: { url: 'http://127.0.0.1:5030', directory, configured: true },
    });
    expect(await readFile(file, 'utf8')).toBe('ciphertext');
    expect(
      await settings.configure({ url: 'http://127.0.0.1:5030', directory, apiKey: '' }),
    ).toEqual(result);
    expect(
      await settings.configure({ url: 'http://other-host:5030', directory, apiKey: 'key' }),
    ).toMatchObject({ ok: false });
    await settings.disconnect();
    expect(await settings.status()).toEqual({ ok: true, value: null });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
