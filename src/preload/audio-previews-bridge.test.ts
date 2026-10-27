import { expect, test, vi } from 'vitest';
import { loadedRelease } from '../../tests/discogs-fixtures';
import { createAudioPreviewsBridge } from './audio-previews-bridge';

test('validates preview metadata and hides transport errors from the renderer', async () => {
  const invoke = vi
    .fn<(channel: string, input: unknown) => Promise<unknown>>()
    .mockResolvedValueOnce({ ok: true, value: { filename: '../private.mp3' } })
    .mockRejectedValueOnce(new Error('private filesystem details'));
  const bridge = createAudioPreviewsBridge(invoke);
  const input = { release: loadedRelease, videoIndex: 0 };
  expect(await bridge.prepare(input)).toMatchObject({ ok: false, error: { code: 'unavailable' } });
  const cancelled = await bridge.cancel('12-abcdefghijk');
  expect(cancelled).toMatchObject({ ok: false, error: { code: 'unavailable' } });
  if (!cancelled.ok) expect(cancelled.error.message).not.toContain('private');
  expect(invoke.mock.calls).toEqual([
    ['audio:preview', input],
    ['audio:cancel-preview', '12-abcdefghijk'],
  ]);
});
