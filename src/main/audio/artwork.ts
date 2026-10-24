import type { AudioResult } from '../../shared/audio';
import { audioFailure } from '../../shared/audioFailure';
import { supportedUrl } from '../discogs/mediaUrl';

export async function fetchArtwork(
  url: string,
  request: typeof fetch,
): Promise<AudioResult<{ mime: string; imageBuffer: Buffer }>> {
  if (!supportedUrl(url, ['i.discogs.com', 'img.discogs.com']))
    return audioFailure('invalid-input', 'Discogs artwork is unavailable.');
  try {
    const response = await request(url, { signal: AbortSignal.timeout(12_000), redirect: 'error' });
    const mime = response.headers.get('content-type')?.split(';')[0];
    if (!response.ok || !response.body || !['image/jpeg', 'image/png'].includes(mime ?? ''))
      return audioFailure('unavailable', 'Discogs artwork could not be embedded.');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    async function read(): Promise<boolean> {
      const chunk = await reader.read();
      if (chunk.done) return true;
      length += chunk.value.length;
      if (length > 8_000_000) {
        await reader.cancel();
        return false;
      }
      chunks.push(chunk.value);
      return read();
    }
    if (await read()) {
      const imageBuffer = Buffer.concat(chunks);
      const jpeg = imageBuffer[0] === 255 && imageBuffer[1] === 216;
      const png = imageBuffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      if ((mime === 'image/jpeg' && jpeg) || (mime === 'image/png' && png))
        return { ok: true, value: { mime, imageBuffer } };
    }
  } catch {
    /* Artwork must never prevent a usable audio download. */
  }
  return audioFailure('unavailable', 'Discogs artwork could not be embedded.');
}
