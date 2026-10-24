import type { IncomingMessage } from 'node:http';
import { catalogueFailure } from '../../shared/catalogueFailure';
import type { CatalogueResult } from '../../shared/catalogue';

export function readResearchRequest(request: IncomingMessage): Promise<CatalogueResult<unknown>> {
  return new Promise((resolve) => {
    let size = 0;
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > 65_536) {
        chunks.length = 0;
        resolve(catalogueFailure('invalid-input', 'The research request is too large.'));
      } else chunks.push(chunk);
    });
    request.on('end', () => {
      if (size > 65_536) return;
      try {
        const value: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        resolve({ ok: true, value });
      } catch {
        resolve(catalogueFailure('invalid-input', 'Send a valid research request.'));
      }
    });
    request.on('error', () => {
      resolve(catalogueFailure('unavailable', 'The research request was interrupted.'));
    });
  });
}
