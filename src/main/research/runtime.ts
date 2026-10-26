import { randomBytes } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { CatalogueResult } from '../../shared/catalogue';
import type { ResearchAccess } from '../../shared/research-access';
import type { ResearchResult } from '../../shared/research-commands';
import { catalogueFailure } from '../../shared/catalogue-failure';
import { createResearchListener } from './listener';

export function createResearchRuntime(
  file: string,
  entry: string,
  execute: (input: unknown, signal: AbortSignal) => Promise<ResearchResult>,
) {
  let listener: ReturnType<typeof createResearchListener> | undefined;
  let queue = Promise.resolve();
  const status = (): ResearchAccess => ({
    enabled: Boolean(listener),
    configuration: {
      command: process.execPath,
      args: [entry, '--connection', file],
      env: { ELECTRON_RUN_AS_NODE: '1' },
    },
  });
  function serialize(operation: () => Promise<CatalogueResult<ResearchAccess>>) {
    const result = queue.then(operation);
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
  return {
    status,
    start: () =>
      serialize(async () => {
        if (listener) return { ok: true, value: status() };
        const key = randomBytes(32).toString('hex');
        const candidate = createResearchListener(key, execute);
        const started = await candidate.listen();
        if (!started.ok) {
          await candidate.close();
          return started;
        }
        const temporary = `${file}.${randomBytes(8).toString('hex')}.tmp`;
        try {
          await mkdir(dirname(file), { recursive: true, mode: 0o700 });
          await writeFile(temporary, JSON.stringify({ url: started.value, key }), {
            mode: 0o600,
            flag: 'wx',
          });
          await rename(temporary, file);
          listener = candidate;
          return { ok: true, value: status() };
        } catch {
          await candidate.close();
          await rm(temporary, { force: true }).catch(() => undefined);
          return catalogueFailure(
            'storage',
            'Research access could not save its local connection. Please retry.',
          );
        }
      }),
    stop: () =>
      serialize(async () => {
        const current = listener;
        listener = undefined;
        if (current) await current.close();
        try {
          if (current) await rm(file, { force: true });
          return { ok: true, value: status() };
        } catch {
          return catalogueFailure(
            'storage',
            'Research access stopped, but its expired connection file could not be removed.',
          );
        }
      }),
  };
}
