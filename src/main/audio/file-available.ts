import { lstat } from 'node:fs/promises';

export async function fileAvailable(file: string): Promise<boolean> {
  try {
    return (await lstat(file)).isFile();
  } catch {
    return false;
  }
}
