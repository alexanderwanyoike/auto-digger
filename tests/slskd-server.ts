import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { once } from 'node:events';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { z } from 'zod';

function readBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolveBody, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk: unknown) => {
      if (typeof chunk === 'string') body += chunk;
    });
    request.once('end', () => {
      try {
        resolveBody(JSON.parse(body) as unknown);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Invalid JSON request'));
      }
    });
    request.once('error', reject);
  });
}
export async function startSlskdFixture(directory: string) {
  const audio = await readFile(resolve('tests/fixtures/tone.flac'));
  const transfer = {
    id: '22222222-2222-4222-8222-222222222222',
    filename: 'Music\\Quiet Orbit.flac',
    state: 'Completed, Succeeded',
    bytesTransferred: audio.length,
    size: audio.length,
  };
  let batchId = '';
  async function handle(request: IncomingMessage, response: ServerResponse) {
    if (request.headers['x-api-key'] !== 'fixture-key') {
      response.writeHead(401).end();
      return;
    }
    const path = request.url ?? '';
    if (request.method === 'DELETE') {
      response.writeHead(204).end();
      return;
    }
    let body: unknown = [];
    if (path.includes('includeResponses'))
      body = {
        isComplete: true,
        responses: [
          {
            username: 'archive_peer',
            files: Array.from({ length: 40 }, (_, index) => ({
              filename:
                index === 0 ? transfer.filename : `Music\\Quiet Orbit ${index.toString()}.flac`,
              size: audio.length,
              length: 372,
            })),
            lockedFileCount: 1,
            lockedFiles: [{ filename: 'Private\\Quiet Orbit.flac', size: audio.length }],
          },
        ],
      };
    else if (path === '/api/v0/searches' && request.method === 'POST')
      body = { id: '11111111-1111-4111-8111-111111111111' };
    else if (path.endsWith('/batches') && request.method === 'POST') {
      const input = z
        .object({
          id: z.uuid(),
          options: z.object({ destination: z.string().regex(/^auto-digger\/[a-f0-9-]{36}$/) }),
        })
        .parse(await readBody(request));
      batchId = input.id;
      const folder = join(directory, input.options.destination);
      await mkdir(folder, { recursive: true });
      await writeFile(join(folder, 'Quiet Orbit.flac'), audio);
      body = { batch: { id: batchId, transfers: [transfer] }, failures: [] };
    } else if (path.includes('/batches/')) body = { id: batchId, transfers: [transfer] };
    response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
  }
  const server = createServer((request, response) => {
    handle(request, response).catch(() => {
      response.writeHead(500).end();
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected a TCP fixture');
  return {
    url: `http://127.0.0.1:${address.port.toString()}`,
    close: () =>
      new Promise<void>((resolveClose, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolveClose();
        });
      }),
  };
}
