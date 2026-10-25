import { lstat, readFile } from 'node:fs/promises';
import { catalogueFailure } from '../shared/catalogueFailure';
import { researchConnectionSchema } from '../shared/researchAccess';
import { researchResultSchema } from '../shared/researchCommands';
import type { ResearchResult } from '../shared/researchCommands';

export async function callResearchApp(
  file: string,
  input: unknown,
  signal?: AbortSignal,
): Promise<ResearchResult> {
  try {
    const info = await lstat(file);
    if (
      !info.isFile() ||
      info.size > 4096 ||
      (process.platform !== 'win32' && info.mode % 0o100 !== 0)
    )
      return catalogueFailure('unavailable', 'Enable MCP in Auto Digger to connect.');
    const value: unknown = JSON.parse(await readFile(file, 'utf8'));
    const connection = researchConnectionSchema.safeParse(value);
    if (!connection.success)
      return catalogueFailure('unavailable', 'Restart research access in Auto Digger.');
    const response = await fetch(connection.data.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${connection.data.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(60_000)])
        : AbortSignal.timeout(60_000),
      redirect: 'error',
    });
    const result = researchResultSchema.safeParse(await response.json());
    if (result.success) return result.data;
  } catch {
    return catalogueFailure(
      'unavailable',
      'Open Auto Digger and enable research access in Settings, then retry.',
    );
  }
  return catalogueFailure(
    'unavailable',
    'Auto Digger returned an unreadable research response. Please retry.',
  );
}
