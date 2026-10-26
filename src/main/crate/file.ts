import { readFile } from 'node:fs/promises';
import { crateSchema } from '../../shared/crate';
import type { CrateResult } from '../../shared/crate';
import { crateFailure } from '../../shared/crate-failure';

export async function readCrate(file: string): Promise<CrateResult> {
  let contents: string;
  try {
    contents = await readFile(file, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      return { ok: true, value: [] };
    return crateFailure(
      'storage',
      'Could not read the saved crate. Check device storage and retry.',
    );
  }
  try {
    const data: unknown = JSON.parse(contents);
    const parsed = crateSchema.safeParse(data);
    if (parsed.success) return { ok: true, value: parsed.data.releases };
  } catch {
    return crateFailure(
      'invalid-data',
      'The saved crate is unreadable. Its file has been preserved.',
    );
  }
  return crateFailure(
    'invalid-data',
    'The saved crate has an unsupported format. Its file has been preserved.',
  );
}
