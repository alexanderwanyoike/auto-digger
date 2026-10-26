import { expect, test } from 'vitest';
import { createDownloadJobsBridge } from './download-jobs-bridge';
import { downloadStage } from '../shared/download-jobs';

test('rejects a completed IPC job without a saved track instead of leaving the UI awaiting it', async () => {
  const bridge = createDownloadJobsBridge(() =>
    Promise.resolve({
      ok: true,
      value: [
        {
          ...downloadStage('complete'),
          id: '00000000-0000-4000-8000-000000000001',
          title: 'Quiet Orbit',
          releaseId: 12,
          videoIndex: 0,
          track: null,
          error: null,
        },
      ],
    }),
  );
  expect(await bridge.list()).toMatchObject({ ok: false, error: { code: 'unavailable' } });
});
