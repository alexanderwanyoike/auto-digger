import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { DiscogsResult } from '../../shared/discogs';
import { discogsFailure } from '../../shared/discogs-failure';

export interface TokenEncryption {
  available: () => Promise<boolean>;
  encrypt: (token: string) => Promise<Buffer>;
  decrypt: (encrypted: Buffer) => Promise<{ result: string; shouldReEncrypt: boolean }>;
}
export function createTokenStore(file: string, encryption: TokenEncryption) {
  async function save(token: string): Promise<DiscogsResult<undefined>> {
    const temporary = `${file}.${randomUUID()}.tmp`;
    try {
      if (!(await encryption.available()))
        return discogsFailure(
          'credential-storage',
          'Unlock your desktop keyring to remember the Discogs token.',
        );
      const encrypted = await encryption.encrypt(token);
      await mkdir(dirname(file), { recursive: true });
      const handle = await open(temporary, 'wx', 0o600);
      try {
        await handle.writeFile(encrypted);
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(temporary, file);
      return { ok: true, value: undefined };
    } catch {
      await rm(temporary, { force: true }).catch(() => undefined);
      return discogsFailure(
        'credential-storage',
        'Could not remember the Discogs token. Check your keyring and device storage, then retry.',
      );
    }
  }
  async function load(): Promise<DiscogsResult<string | null>> {
    let encrypted: Buffer;
    try {
      encrypted = await readFile(file);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
        return { ok: true, value: null };
      return discogsFailure(
        'credential-storage',
        'Could not read the saved Discogs token. Please retry.',
      );
    }
    try {
      if (!(await encryption.available()))
        return discogsFailure(
          'credential-storage',
          'Unlock your desktop keyring to reconnect your saved Discogs account.',
        );
      const decoded = await encryption.decrypt(encrypted);
      if (decoded.shouldReEncrypt) {
        const saved = await save(decoded.result);
        if (!saved.ok) return saved;
      }
      return { ok: true, value: decoded.result };
    } catch {
      return discogsFailure(
        'credential-storage',
        'Could not unlock the saved Discogs token. Retry or forget it and connect again.',
      );
    }
  }
  async function clear(): Promise<DiscogsResult<undefined>> {
    try {
      await rm(file, { force: true });
      return { ok: true, value: undefined };
    } catch {
      return discogsFailure(
        'credential-storage',
        'Could not remove the saved Discogs token. Check device storage and retry forgetting it.',
      );
    }
  }
  return { load, save, clear };
}
