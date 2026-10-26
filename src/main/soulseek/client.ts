import { randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';
import { cleanSoulseekQuery } from '../../shared/soulseek';
import type { SoulseekMatch, SoulseekResults } from '../../shared/soulseek';
import type { AudioResult } from '../../shared/audio';
import { audioFailure } from '../../shared/audioFailure';
import { createSlskdHttp } from './http';

const fileSchema = z.object({
  filename: z.string(),
  size: z.number(),
  bitRate: z.number().nullish(),
  length: z.number().nullish(),
});
const responseSchema = z.object({
  username: z.string(),
  files: z.array(fileSchema),
  lockedFiles: z.array(fileSchema).default([]),
  lockedFileCount: z.number().default(0),
});
const searchSchema = z.object({
  isComplete: z.boolean(),
  responses: z.array(responseSchema).default([]),
});
export const transferSchema = z.object({
  id: z.string(),
  filename: z.string(),
  state: z.string(),
  bytesTransferred: z.number(),
  size: z.number(),
  averageSpeed: z.number().default(0),
  percentComplete: z.number().default(0),
});
export const batchSchema = z.object({ id: z.string(), transfers: z.array(transferSchema) });
export function createSlskdClient(
  config: { url: string; apiKey: string },
  request: typeof fetch = fetch,
) {
  const call = createSlskdHttp(config, request);
  return {
    call,
    check: () => call('/searches', z.array(z.unknown())),
    async startSearch(input: string) {
      const query = cleanSoulseekQuery(input);
      if (!query)
        return audioFailure<{ id: string; query: string }>(
          'invalid-input',
          'Enter an artist or track title.',
        );
      const result = await call('/searches', z.object({ id: z.string() }), 'POST', {
        id: randomUUID(),
        searchText: query,
        fileLimit: 1000,
        responseLimit: 100,
      });
      return result.ok ? { ok: true as const, value: { id: result.value.id, query } } : result;
    },
    async readSearch(id: string): Promise<AudioResult<SoulseekResults>> {
      const result = await call(
        `/searches/${encodeURIComponent(id)}?includeResponses=true`,
        searchSchema,
      );
      if (!result.ok) return result;
      const matches: SoulseekMatch[] = [];
      let privateCount = 0;
      result.value.responses.forEach((response) => {
        privateCount += Math.max(response.lockedFileCount, response.lockedFiles.length);
        const add = (file: z.infer<typeof fileSchema>, access: SoulseekMatch['access']) => {
          if (
            matches.length >= 1000 ||
            !/\.(mp3|flac|wav|m4a|ogg|opus|aiff?)$/i.test(file.filename) ||
            file.size <= 0 ||
            file.size > 2_000_000_000
          )
            return;
          const key = JSON.stringify([response.username, file.filename, file.size]);
          matches.push({
            id: createHash('sha256').update(key).digest('hex').slice(0, 32),
            username: response.username,
            filename: file.filename,
            size: file.size,
            bitRate: file.bitRate ?? null,
            length: file.length ?? null,
            access,
          });
        };
        response.files.forEach((file) => {
          add(file, 'public');
        });
        response.lockedFiles.forEach((file) => {
          add(file, 'private');
        });
      });
      const unique = [...new Map(matches.map((match) => [match.id, match])).values()];
      return {
        ok: true,
        value: { complete: result.value.isComplete, privateCount, matches: unique },
      };
    },
    stop: (id: string) => call(`/searches/${encodeURIComponent(id)}`, z.unknown(), 'DELETE'),
    enqueue: (match: SoulseekMatch, batchId: string, signal?: AbortSignal) =>
      call(
        '/transfers/downloads/batches',
        z.object({ batch: batchSchema, failures: z.array(z.unknown()) }),
        'POST',
        {
          id: batchId,
          username: match.username,
          files: [{ filename: match.filename, size: match.size }],
          options: { destination: `auto-digger/${batchId}` },
        },
        signal,
      ),
    batch: (id: string, signal?: AbortSignal) =>
      call(
        `/transfers/downloads/batches/${encodeURIComponent(id)}`,
        batchSchema,
        'GET',
        undefined,
        signal,
      ),
    cancel: (username: string, id: string) =>
      call(
        `/transfers/downloads/${encodeURIComponent(username)}/${encodeURIComponent(id)}?remove=false`,
        z.unknown(),
        'DELETE',
      ),
  };
}
