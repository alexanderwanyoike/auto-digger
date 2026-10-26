import { expect, test, vi } from 'vitest';
import { createSlskdClient } from './client';

test('cleans a search, preserves locked results and authenticates only to the configured API', async () => {
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'search-id' })))
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          isComplete: true,
          responses: [
            {
              username: 'peer',
              files: [
                { filename: 'Music\\Björk - Jóga.mp3', size: 123, bitRate: 320, length: 210 },
              ],
              lockedFileCount: 3,
              lockedFiles: [{ filename: 'Private\\Björk - Jóga.mp3', size: 234 }],
            },
          ],
        }),
      ),
    );
  const client = createSlskdClient({ url: 'http://127.0.0.1:5030', apiKey: 'test-key' }, request);
  const started = await client.startSearch('Björk / Jóga (Live)!');
  expect(started).toMatchObject({ ok: true, value: { id: 'search-id', query: 'Björk Jóga Live' } });
  expect(request.mock.calls[0]?.[0]).toBe('http://127.0.0.1:5030/api/v0/searches');
  expect(request.mock.calls[0]?.[1]).toMatchObject({
    redirect: 'error',
    headers: { 'X-API-Key': 'test-key' },
  });
  expect(request.mock.calls[0]?.[1]?.body).toContain('Björk Jóga Live');
  const body = request.mock.calls[0]?.[1]?.body;
  if (typeof body !== 'string') throw new Error('Expected JSON search options');
  const sent: unknown = JSON.parse(body);
  expect(sent).not.toHaveProperty('searchTimeout');
  const results = await client.readSearch('search-id');
  expect(results).toMatchObject({
    ok: true,
    value: {
      complete: true,
      privateCount: 3,
      matches: [
        { username: 'peer', filename: 'Music\\Björk - Jóga.mp3', access: 'public' },
        { username: 'peer', filename: 'Private\\Björk - Jóga.mp3', access: 'private' },
      ],
    },
  });
});
