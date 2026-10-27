import { z } from 'zod';
import { audioErrorSchema, localTrackSchema } from '../shared/audio';
import type { AudioResult } from '../shared/audio';
import { audioPreviewChannels } from '../shared/audio-previews';
import type { AudioPreviewBridge } from '../shared/audio-previews';
import { audioFailure } from '../shared/audio-failure';

export function createAudioPreviewsBridge(
  invoke: (channel: string, input: unknown) => Promise<unknown>,
): AudioPreviewBridge {
  async function call<T>(
    channel: string,
    input: unknown,
    schema: z.ZodType<T>,
  ): Promise<AudioResult<T>> {
    try {
      const result = z
        .discriminatedUnion('ok', [
          z.object({ ok: z.literal(true), value: schema }),
          z.object({ ok: z.literal(false), error: audioErrorSchema }),
        ])
        .safeParse(await invoke(channel, input));
      if (result.success) return result.data;
    } catch {
      return audioFailure('unavailable', 'The preview could not be reached. Please retry.');
    }
    return audioFailure(
      'unavailable',
      'The preview returned an unreadable response. Please retry.',
    );
  }
  return {
    prepare: (input) => call(audioPreviewChannels.prepare, input, localTrackSchema),
    cancel: (id) => call(audioPreviewChannels.cancel, id, z.undefined()),
  };
}
