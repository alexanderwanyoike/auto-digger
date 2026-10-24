import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { crateSchema } from '../../shared/crate';
import type { CrateResult } from '../../shared/crate';
import type { DiscogsRelease } from '../../shared/discogs';
import { crateFailure } from '../../shared/crateFailure';

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

export async function writeCrate(file: string, releases: DiscogsRelease[]): Promise<CrateResult> {
  const temporary = join(dirname(file), `.${basename(file)}.${randomUUID()}.tmp`);
  try {
    await mkdir(dirname(file), { recursive: true });
    const handle = await open(temporary, 'wx', 0o600);
    try {
      await handle.writeFile(JSON.stringify({ version: 1, releases }), 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporary, file);
    return { ok: true, value: releases };
  } catch {
    await rm(temporary, { force: true }).catch(() => undefined);
    return crateFailure('storage', 'Could not save the crate. Check device storage and retry.');
  }
}
