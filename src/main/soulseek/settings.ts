import { lstat } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { soulseekSettingsSchema } from '../../shared/soulseek';
import type { SoulseekSettings, SoulseekStatus } from '../../shared/soulseek';
import type { AudioResult } from '../../shared/audio';
import { audioFailure } from '../../shared/audio-failure';
import { createTokenStore } from '../credentials/token-store';
import type { TokenEncryption } from '../credentials/token-store';
import { createSlskdClient } from './client';

export function createSoulseekSettings(
  file: string,
  encryption: TokenEncryption,
  request: typeof fetch = fetch,
) {
  const store = createTokenStore(file, encryption);
  const storageError = () =>
    audioFailure<never>(
      'storage',
      'Unlock your desktop keyring and check device storage to use saved slskd settings.',
    );
  async function load(): Promise<AudioResult<SoulseekSettings | null>> {
    const saved = await store.load();
    if (!saved.ok) return storageError();
    if (saved.value === null) return { ok: true, value: null };
    try {
      const value = soulseekSettingsSchema.safeParse(JSON.parse(saved.value) as unknown);
      if (value.success && isAbsolute(value.data.directory) && value.data.apiKey)
        return { ok: true, value: value.data };
    } catch {
      /* Only the validated encrypted settings format is accepted. */
    }
    return audioFailure(
      'invalid-data',
      'Saved slskd settings could not be read. Reconnect in Settings.',
    );
  }
  async function status(): Promise<AudioResult<SoulseekStatus | null>> {
    const result = await load();
    if (!result.ok || !result.value) return result.ok ? { ok: true, value: null } : result;
    return {
      ok: true,
      value: { url: result.value.url, directory: result.value.directory, configured: true },
    };
  }
  return {
    load,
    status,
    async configure(input: unknown): Promise<AudioResult<SoulseekStatus>> {
      const parsed = soulseekSettingsSchema.safeParse(input);
      if (!parsed.success || !isAbsolute(parsed.data.directory))
        return audioFailure(
          'invalid-input',
          'Choose a valid slskd URL and an absolute completed-downloads folder. Use HTTPS for remote servers.',
        );
      let { apiKey } = parsed.data;
      if (!apiKey) {
        const current = await load();
        if (!current.ok) return current;
        apiKey = current.value?.apiKey ?? '';
      }
      if (!apiKey) return audioFailure('invalid-input', 'Enter a slskd ReadWrite API key.');
      try {
        if (!(await lstat(parsed.data.directory)).isDirectory())
          return audioFailure(
            'storage',
            'Choose the slskd completed-downloads folder visible on this computer.',
          );
      } catch {
        return audioFailure(
          'storage',
          'The slskd completed-downloads folder could not be read. Check its Docker volume mapping.',
        );
      }
      const value = { ...parsed.data, apiKey };
      const checked = await createSlskdClient(value, request).check();
      if (!checked.ok) return checked;
      const saved = await store.save(JSON.stringify(value));
      return saved.ok
        ? { ok: true, value: { url: value.url, directory: value.directory, configured: true } }
        : storageError();
    },
    async disconnect(): Promise<AudioResult<undefined>> {
      const result = await store.clear();
      return result.ok ? result : storageError();
    },
  };
}
