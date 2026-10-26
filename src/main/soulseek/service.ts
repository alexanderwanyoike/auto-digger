import { z } from 'zod';
import type { AudioResult } from '../../shared/audio';
import type { SoulseekSettings, SoulseekMatch, SoulseekResults } from '../../shared/soulseek';
import { audioFailure } from '../../shared/audio-failure';
import type { ReceiveSoulseek } from '../audio/soulseek-library';
import { createSlskdClient } from './client';
import { receiveFile } from './receive';

export function createSoulseekService(
  load: () => Promise<AudioResult<SoulseekSettings | null>>,
  request: typeof fetch = fetch,
) {
  interface Search {
    client: ReturnType<typeof createSlskdClient>;
    settings: SoulseekSettings;
    matches: SoulseekMatch[];
  }
  const searches = new Map<string, Search>();
  const receive: ReceiveSoulseek = async (input, options) => {
    const current = await load();
    if (!current.ok) return current;
    const configuration = current.value;
    if (!configuration)
      return audioFailure('unavailable', 'Connect slskd in Settings before downloading.');
    const search = [...searches.values()].find(
      (entry) =>
        entry.settings.url === configuration.url &&
        entry.settings.apiKey === configuration.apiKey &&
        entry.settings.directory === configuration.directory &&
        entry.matches.some((match) => match.id === input.candidateId && match.access === 'public'),
    );
    const match = search?.matches.find(
      (item) => item.id === input.candidateId && item.access === 'public',
    );
    if (!search || !match)
      return audioFailure(
        'invalid-input',
        'This match is private or has expired. Search again and choose a public match.',
      );
    return receiveFile(search.client, search.settings.directory, match, options);
  };
  return {
    receive,
    async search(input: unknown) {
      const query = z.string().min(1).max(256).safeParse(input);
      if (!query.success)
        return audioFailure<{ id: string; query: string }>(
          'invalid-input',
          'Enter an artist or title using up to 256 characters.',
        );
      const settings = await load();
      if (!settings.ok) return settings;
      if (!settings.value)
        return audioFailure<{ id: string; query: string }>(
          'unavailable',
          'Connect slskd in Settings to search Soulseek.',
        );
      const client = createSlskdClient(settings.value, request);
      const result = await client.startSearch(query.data);
      if (result.ok) {
        if (searches.size >= 10) {
          const oldest = searches.entries().next().value;
          if (oldest) {
            await oldest[1].client.stop(oldest[0]);
            searches.delete(oldest[0]);
          }
        }
        searches.set(result.value.id, { client, settings: settings.value, matches: [] });
      }
      return result;
    },
    async results(id: unknown): Promise<AudioResult<SoulseekResults>> {
      const search = typeof id === 'string' ? searches.get(id) : undefined;
      if (!search || typeof id !== 'string')
        return audioFailure('invalid-input', 'This search has expired. Search again.');
      const result = await search.client.readSearch(id);
      if (result.ok) search.matches = result.value.matches;
      return result;
    },
    async stop(id: unknown): Promise<AudioResult<undefined>> {
      const search = typeof id === 'string' ? searches.get(id) : undefined;
      if (search && typeof id === 'string') {
        const result = await search.client.stop(id);
        if (!result.ok) return result;
      }
      return { ok: true, value: undefined };
    },
    async close() {
      await Promise.all([...searches.entries()].map(([id, search]) => search.client.stop(id)));
      searches.clear();
    },
  };
}
