import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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

test.each(['{invalid-json', 'unreadable'])(
  'replaces %s saved settings with a fresh API key',
  async (damaged) => {
    const directory = await mkdtemp(join(tmpdir(), 'auto-digger-reconnect-'));
    const file = join(directory, 'slskd.bin');
    const encryption = {
      available: () => Promise.resolve(true),
      encrypt: (value: string) => Promise.resolve(Buffer.from(value)),
      decrypt: (value: Buffer) => {
        if (value.toString() === 'unreadable') return Promise.reject(new Error('Key unavailable'));
        return Promise.resolve({ result: value.toString(), shouldReEncrypt: false });
      },
    };
    const settings = createSoulseekSettings(file, encryption, () =>
      Promise.resolve(new Response('[]')),
    );
    const input = { url: 'http://127.0.0.1:5030', directory, apiKey: '' };
    try {
      await writeFile(file, damaged);
      expect(await settings.status()).toMatchObject({ ok: false });
      expect(await settings.configure(input)).toMatchObject({ ok: false });
      expect(await readFile(file, 'utf8')).toBe(damaged);
      expect(await settings.configure({ ...input, apiKey: 'replacement-key' })).toEqual({
        ok: true,
        value: { url: input.url, directory, configured: true },
      });
      expect(await settings.status()).toEqual({
        ok: true,
        value: { url: input.url, directory, configured: true },
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);
