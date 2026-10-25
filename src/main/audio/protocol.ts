import { net, protocol } from 'electron';
import { stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import type { createIndexedLibrary } from './indexedLibrary';

export function registerAudioScheme() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'auto-digger-audio',
      privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true },
    },
  ]);
}

export function registerAudioProtocol(library: ReturnType<typeof createIndexedLibrary>) {
  protocol.handle('auto-digger-audio', async (request) => {
    const url = new URL(request.url);
    if (url.hostname !== 'track' || !['GET', 'HEAD'].includes(request.method))
      return new Response(null, { status: 404 });
    const track = await library.locate(url.pathname.slice(1));
    if (!track.ok) return new Response(null, { status: 404 });
    try {
      const { file } = track.value;
      const { size } = await stat(file);
      const range = request.headers.get('range');
      let start = 0;
      let end = size - 1;
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!match || (!match[1] && !match[2]))
          return new Response(null, {
            status: 416,
            headers: { 'Content-Range': `bytes */${size.toString()}` },
          });
        start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
        end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
        if (
          !Number.isSafeInteger(start) ||
          !Number.isSafeInteger(end) ||
          start > end ||
          start >= size
        )
          return new Response(null, {
            status: 416,
            headers: { 'Content-Range': `bytes */${size.toString()}` },
          });
      }
      const headers = new Headers({
        'Content-Type': 'audio/mpeg',
        'Accept-Ranges': 'bytes',
        'Content-Length': (end - start + 1).toString(),
      });
      if (range)
        headers.set(
          'Content-Range',
          `bytes ${start.toString()}-${end.toString()}/${size.toString()}`,
        );
      if (request.method === 'HEAD')
        return new Response(null, { status: range ? 206 : 200, headers });
      const audio = await net.fetch(pathToFileURL(file).href, {
        headers: range ? { Range: `bytes=${start.toString()}-${end.toString()}` } : {},
        signal: request.signal,
      });
      return new Response(audio.body, { status: range ? 206 : 200, headers });
    } catch {
      return new Response(null, { status: 404 });
    }
  });
}
