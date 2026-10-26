import { expect, test, vi } from 'vitest';
import { createAudioBridge } from './audio-bridge';

test('validates audio responses and hides transport errors at the desktop boundary', async () => {
  const invoke = vi
    .fn<(channel: string, input?: unknown) => Promise<unknown>>()
    .mockResolvedValueOnce({ ok: true, value: [] })
    .mockResolvedValueOnce({ ok: true, value: { videoId: 'abcdefghijk', title: 'Track' } })
    .mockResolvedValueOnce({ ok: true, value: { filename: '../secret' } })
    .mockRejectedValueOnce(new Error('private details'));
  const bridge = createAudioBridge(invoke);
  expect(await bridge.list()).toEqual({ ok: true, value: [] });
  expect(await bridge.probe('https://youtu.be/abcdefghijk')).toEqual({
    ok: true,
    value: { videoId: 'abcdefghijk', title: 'Track' },
  });
  expect(await bridge.list()).toMatchObject({ ok: false, error: { code: 'unavailable' } });
  expect(await bridge.reveal()).toMatchObject({ ok: false, error: { code: 'unavailable' } });
  expect(invoke.mock.calls[1]).toEqual(['audio:probe', 'https://youtu.be/abcdefghijk']);
});
