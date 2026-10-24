import { createServer } from 'node:http';
import type { Server, ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { catalogueFailure } from '../../shared/catalogueFailure';
import type { CatalogueResult } from '../../shared/catalogue';
import type { ResearchResult } from '../../shared/researchCommands';
import { readResearchRequest } from './readRequest';

function respond(response: ServerResponse, status: number, result: ResearchResult) {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    Connection: 'close',
  });
  response.end(JSON.stringify(result));
}
export function createResearchListener(
  key: string,
  execute: (input: unknown, signal: AbortSignal) => Promise<ResearchResult>,
) {
  const controllers = new Set<AbortController>();
  const tasks = new Set<Promise<void>>();
  let accepting = true;
  const server: Server = createServer((request, response) => {
    const task = (async () => {
      const auth = Buffer.from(request.headers.authorization ?? '');
      const expected = Buffer.from(`Bearer ${key}`);
      if (!accepting || auth.length !== expected.length || !timingSafeEqual(auth, expected)) {
        respond(
          response,
          401,
          catalogueFailure('unavailable', 'Enable research access in Auto Digger to connect.'),
        );
        return;
      }
      const address = server.address();
      if (
        request.headers.origin !== undefined ||
        typeof address !== 'object' ||
        address === null ||
        request.headers.host !== `127.0.0.1:${address.port.toString()}`
      ) {
        respond(
          response,
          403,
          catalogueFailure('unavailable', 'This research request is not allowed.'),
        );
        return;
      }
      if (request.method !== 'POST' || request.url !== '/research') {
        respond(
          response,
          404,
          catalogueFailure('invalid-input', 'Choose a supported research operation.'),
        );
        return;
      }
      const controller = new AbortController();
      controllers.add(controller);
      response.on('close', () => {
        if (!response.writableEnded) controller.abort();
      });
      try {
        const input = await readResearchRequest(request);
        if (!input.ok) {
          respond(response, input.error.message.includes('too large') ? 413 : 400, input);
          return;
        }
        const result = await execute(input.value, controller.signal);
        if (!controller.signal.aborted) respond(response, 200, result);
      } finally {
        controllers.delete(controller);
      }
    })().catch(() => {
      if (!response.headersSent)
        respond(
          response,
          500,
          catalogueFailure('unavailable', 'Research could not finish. Please retry.'),
        );
    });
    tasks.add(task);
    task
      .finally(() => {
        tasks.delete(task);
      })
      .catch(() => undefined);
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  server.setTimeout(30_000, (socket) => socket.destroy());
  return {
    listen: () =>
      new Promise<CatalogueResult<string>>((resolve) => {
        server.once('error', () =>
          resolve(
            catalogueFailure('unavailable', 'Research access could not start. Please retry.'),
          ),
        );
        server.listen(0, '127.0.0.1', () => {
          const address = server.address();
          resolve(
            typeof address === 'object' && address !== null
              ? { ok: true, value: `http://127.0.0.1:${address.port.toString()}/research` }
              : catalogueFailure('unavailable', 'Research access could not start.'),
          );
        });
      }),
    async close() {
      accepting = false;
      controllers.forEach((controller) => controller.abort());
      const closed = new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
      server.closeAllConnections();
      await Promise.allSettled([...tasks]);
      await closed;
    },
  };
}
