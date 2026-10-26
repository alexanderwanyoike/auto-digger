import { extname } from 'node:path';

const types: Readonly<Record<string, string>> = {
  '.mp3': 'audio/mpeg',
  '.flac': 'audio/flac',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
};
export function audioContentType(file: string): string {
  return types[extname(file).toLowerCase()] ?? 'application/octet-stream';
}
