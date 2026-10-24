import { randomUUID } from 'node:crypto';
import { downloadInputSchema } from '../../shared/audio';
import type { AudioResult } from '../../shared/audio';
import type { PlaybackItem } from '../../shared/playback';
import { audioFailure } from '../../shared/audioFailure';
import { matchTrack } from '../../shared/matchTrack';
import type { ResolvedPreview } from './previewResolver';
import { isPreviewUrl } from './previewResolver';

export function createPreviewSession(
  resolve: (url: string) => Promise<AudioResult<ResolvedPreview>>,
  request: typeof fetch = fetch,
) {
  let revision = 0;
  let active: { id: string; source: ResolvedPreview; expires: number } | undefined;
  const controllers = new Set<AbortController>();
  function stop(): AudioResult<undefined> {
    revision += 1;
    active = undefined;
    controllers.forEach((controller) => {
      controller.abort();
    });
    controllers.clear();
    return { ok: true, value: undefined };
  }
  return {
    stop,
    async start(input: unknown): Promise<AudioResult<PlaybackItem>> {
      stop();
      const version = revision;
      const parsed = downloadInputSchema.safeParse(input);
      if (!parsed.success)
        return audioFailure('invalid-input', 'Choose a valid source to preview.');
      const { release, videoIndex, trackIndex } = parsed.data;
      const video = release.videos[videoIndex];
      if (!video || (typeof trackIndex === 'number' && !release.tracks[trackIndex]))
        return audioFailure('invalid-input', 'Choose a valid source to preview.');
      const result = await resolve(video.url);
      if (version !== revision)
        return audioFailure('unavailable', 'Another source replaced this preview.');
      if (!result.ok) return result;
      if (!isPreviewUrl(result.value.url))
        return audioFailure('unavailable', 'This source cannot be previewed.');
      const id = randomUUID();
      active = { id, source: result.value, expires: Date.now() + 60 * 60 * 1000 };
      const index = trackIndex === undefined ? matchTrack(release, result.value.title) : trackIndex;
      const title =
        index === null ? result.value.title : (release.tracks[index]?.title ?? result.value.title);
      return {
        ok: true,
        value: {
          id,
          title,
          artist: release.artists.join(' / '),
          album: release.title,
          artworkUrl: release.artworkUrl,
          source: 'preview',
          url: `auto-digger-audio://preview/${id}`,
        },
      };
    },
    async serve(input: Request): Promise<Response> {
      const url = new URL(input.url);
      if (
        !active ||
        url.hostname !== 'preview' ||
        url.pathname !== `/${active.id}` ||
        Date.now() >= active.expires ||
        !['GET', 'HEAD'].includes(input.method)
      )
        return new Response(null, { status: 404 });
      const range = input.headers.get('range');
      if (range && !/^bytes=(\d+-\d*|-\d+)$/.test(range))
        return new Response(null, { status: 416 });
      const controller = new AbortController();
      controllers.add(controller);
      const timeout = setTimeout(() => {
        controller.abort();
      }, 20_000);
      try {
        const response = await request(active.source.url, {
          method: input.method,
          headers: { ...active.source.headers, ...(range ? { Range: range } : {}) },
          signal: AbortSignal.any([controller.signal, input.signal]),
          redirect: 'error',
          credentials: 'omit',
        });
        if (!response.ok) {
          controllers.delete(controller);
          return new Response(null, { status: 502 });
        }
        const headers = new Headers({ 'Cache-Control': 'no-store' });
        ['content-type', 'content-length', 'content-range', 'accept-ranges'].forEach((name) => {
          const value = response.headers.get(name);
          if (value) headers.set(name, value);
        });
        return new Response(input.method === 'HEAD' ? null : response.body, {
          status: response.status,
          headers,
        });
      } catch {
        controllers.delete(controller);
        return new Response(null, { status: 502 });
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
