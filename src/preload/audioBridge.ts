import { z } from 'zod';
import { audioChannels, audioErrorSchema, localTrackSchema, sourceSchema } from '../shared/audio';
import type { AudioBridge, AudioResult } from '../shared/audio';
import { playbackItemSchema } from '../shared/playback';
import { audioFailure } from '../shared/audioFailure';

export function createAudioBridge(
  invoke: (channel: string, input?: unknown) => Promise<unknown>,
): AudioBridge {
  async function call<T>(
    channel: string,
    schema: z.ZodType<T>,
    input?: unknown,
  ): Promise<AudioResult<T>> {
    try {
      const envelope = z.discriminatedUnion('ok', [
        z.object({ ok: z.literal(true), value: schema }),
        z.object({ ok: z.literal(false), error: audioErrorSchema }),
      ]);
      const result = envelope.safeParse(await invoke(channel, input));
      if (result.success) return result.data;
    } catch {
      /* Never pass process or filesystem details into the renderer. */
    }
    return audioFailure(
      'unavailable',
      'Could not contact your audio library. Please retry or restart Auto Digger.',
    );
  }
  return {
    preview: (input) => call(audioChannels.preview, playbackItemSchema, input),
    stopPreview: () => call(audioChannels.stopPreview, z.undefined()),
    list: () => call(audioChannels.list, z.array(localTrackSchema)),
    probe: (url) => call(audioChannels.probe, sourceSchema, url),
    download: (input) => call(audioChannels.download, localTrackSchema, input),
    reveal: (id) => call(audioChannels.reveal, z.undefined(), id),
  };
}
