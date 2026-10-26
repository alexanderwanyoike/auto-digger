import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { loadedRelease } from '../../../tests/discogsFixtures';
import { createSoulseekService } from './service';

test('rejects stale matches after connection settings change and uses the new connection for fresh matches', async () => {
  let settings = { url: 'http://localhost:5030', apiKey: 'old-key', directory: '/old' };
  const headers: string[] = [];
  const request: typeof fetch = (url, init) => {
    if (typeof url !== 'string') throw new Error('Expected URL string');
    if (url.endsWith('/searches'))
      return Promise.resolve(new Response(JSON.stringify({ id: settings.apiKey })));
    if (url.includes('includeResponses'))
      return Promise.resolve(
        new Response(
          JSON.stringify({
            isComplete: true,
            responses: [{ username: 'peer', files: [{ filename: 'Track.flac', size: 5 }] }],
          }),
        ),
      );
    headers.push(new Headers(init?.headers).get('X-API-Key') ?? '');
    return Promise.resolve(new Response(null, { status: 400 }));
  };
  const service = createSoulseekService(
    () => Promise.resolve({ ok: true, value: settings }),
    request,
  );
  await service.search('Track');
  const previous = await service.results('old-key');
  if (!previous.ok || !previous.value.matches[0]) throw new Error('Expected a public match');
  settings = { ...settings, apiKey: 'new-key', directory: '/new' };
  const input = {
    provider: 'soulseek' as const,
    release: loadedRelease,
    trackIndex: 0,
    candidateId: previous.value.matches[0].id,
  };
  expect(await service.receive(input, {})).toMatchObject({
    ok: false,
    error: { code: 'invalid-input' },
  });
  expect(headers).toEqual([]);
  await service.search('Track');
  await service.results('new-key');
  await service.receive(input, {});
  expect(headers.length).toBeGreaterThan(0);
  expect(headers.every((key) => key === 'new-key')).toBe(true);
});

test('downloads only a public server-issued match and waits for the completed local file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-slskd-'));
  const transfer = {
    id: 'transfer-id',
    filename: 'Music\\Track.flac',
    size: 5,
    state: 'Completed, Succeeded',
    bytesTransferred: 5,
  };
  const request: typeof fetch = async (url, init) => {
    if (typeof url !== 'string') throw new Error('Expected a string URL');
    const path = url;
    let response: unknown = { id: 'search' };
    if (path.includes('includeResponses'))
      response = {
        isComplete: true,
        responses: [
          {
            username: 'peer',
            files: [{ filename: transfer.filename, size: 5 }],
            lockedFileCount: 1,
            lockedFiles: [{ filename: 'Private\\Track.flac', size: 5 }],
          },
        ],
      };
    if (path.endsWith('/batches')) {
      if (typeof init?.body !== 'string') throw new Error('Expected a JSON request body');
      const body: unknown = JSON.parse(init.body);
      const { z } = await import('zod');
      const batch = z
        .object({ id: z.string(), options: z.object({ destination: z.string() }) })
        .parse(body);
      const destination = join(directory, batch.options.destination);
      await mkdir(destination, { recursive: true });
      await writeFile(join(destination, 'Track.flac'), 'audio');
      response = { batch: { id: batch.id, transfers: [transfer] }, failures: [] };
    } else if (path.includes('/batches/')) response = { id: 'batch', transfers: [transfer] };
    return new Response(JSON.stringify(response));
  };
  const service = createSoulseekService(
    () =>
      Promise.resolve({
        ok: true,
        value: { url: 'http://localhost:5030', apiKey: 'test-key', directory },
      }),
    request,
  );
  try {
    expect(await service.search('Track')).toMatchObject({ ok: true });
    const results = await service.results('search');
    if (!results.ok) throw new Error(results.error.message);
    const publicMatch = results.value.matches.find((match) => match.access === 'public');
    const privateMatch = results.value.matches.find((match) => match.access === 'private');
    if (!publicMatch || !privateMatch) throw new Error('Expected both access states');
    const input = {
      provider: 'soulseek' as const,
      release: loadedRelease,
      trackIndex: 0,
      candidateId: privateMatch.id,
    };
    expect(await service.receive(input, {})).toMatchObject({
      ok: false,
      error: { code: 'invalid-input' },
    });
    const received = await service.receive({ ...input, candidateId: publicMatch.id }, {});
    if (!received.ok) throw new Error(received.error.message);
    expect(await readFile(received.value.file, 'utf8')).toBe('audio');
    expect(await service.receive({ ...input, candidateId: 'f'.repeat(32) }, {})).toMatchObject({
      ok: false,
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
