import { expect, test } from 'vitest';
import { createSlskdClient } from './client';
import { receiveFile } from './receive';

test.each([204, 403])(
  'reconciles an accepted enqueue after its response is aborted and handles cancellation status %i',
  async (status) => {
    const controller = new AbortController();
    let cancellations = 0;
    let reconciliations = 0;
    const request: typeof fetch = (_url, init) => {
      if (init?.method === 'POST') {
        controller.abort();
        return Promise.reject(new Error('Accepted remotely; response was aborted'));
      }
      if (init?.method === 'DELETE') {
        cancellations += 1;
        return Promise.resolve(new Response(null, { status }));
      }
      reconciliations += 1;
      expect(init?.signal?.aborted).toBe(false);
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: 'batch',
            transfers: [
              {
                id: 'owned-transfer',
                filename: 'Track.mp3',
                state: 'InProgress',
                size: 100,
                bytesTransferred: 10,
              },
            ],
          }),
        ),
      );
    };
    const client = createSlskdClient(
      { url: 'http://localhost:5030', apiKey: 'fixture-key' },
      request,
    );
    const result = await receiveFile(
      client,
      '/unused',
      {
        id: 'a'.repeat(32),
        username: 'peer',
        filename: 'Track.mp3',
        size: 100,
        bitRate: 320,
        length: 60,
        access: 'public',
      },
      { signal: controller.signal },
    );
    expect(reconciliations).toBe(1);
    expect(cancellations).toBe(1);
    expect(result).toMatchObject({
      ok: false,
      error: { code: status === 204 ? 'cancelled' : 'network' },
    });
    if (status === 403 && !result.ok) expect(result.error.message).toContain('Check slskd');
  },
);
