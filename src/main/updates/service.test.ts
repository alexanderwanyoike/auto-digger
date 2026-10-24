import { expect, test, vi } from 'vitest';
import { createUpdateService } from './service';
import type { UpdateBackend } from './service';

test('offers a new version, reports measured download progress and only installs when ready', async () => {
  let finish: () => void = () => {
    throw new Error('No pending download');
  };
  const install = vi.fn().mockResolvedValue({ ok: true, value: undefined });
  const backend: UpdateBackend = {
    manual: false,
    check: () => Promise.resolve({ ok: true, value: '0.2.0' }),
    download: (progress) =>
      new Promise((resolve) => {
        progress(42);
        finish = () => {
          resolve({ ok: true, value: undefined });
        };
      }),
    install,
  };
  const updates = createUpdateService(backend);
  expect(await updates.install()).toMatchObject({ ok: false });
  expect(install).not.toHaveBeenCalled();
  expect(await updates.check()).toMatchObject({
    ok: true,
    value: { stage: 'available', version: '0.2.0', manual: false },
  });
  const downloading = updates.download();
  expect(updates.status()).toEqual({ stage: 'downloading', version: '0.2.0', percent: 42 });
  expect(await updates.download()).toMatchObject({ ok: false });
  finish();
  expect(await downloading).toMatchObject({
    ok: true,
    value: { stage: 'ready', version: '0.2.0' },
  });
  expect(await updates.install()).toMatchObject({ ok: true });
  expect(install).toHaveBeenCalledOnce();
});
