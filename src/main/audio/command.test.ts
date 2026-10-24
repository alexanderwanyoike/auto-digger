import { expect, test } from 'vitest';
import { createCommandRunner } from './command';

test('executes without a shell and returns polished failures for missing tools, blocked sources and timeouts', async () => {
  const runner = createCommandRunner(process.execPath);
  expect(
    await runner.execute(['-e', 'process.stdout.write(process.argv[1])', '$(echo unsafe)'], 1000),
  ).toEqual({ ok: true, value: '$(echo unsafe)' });
  const blocked = await runner.execute(
    ['-e', 'process.stderr.write("ERROR: Private video"); process.exit(1)'],
    1000,
  );
  expect(blocked).toMatchObject({
    ok: false,
    error: { code: 'unavailable', message: expect.stringContaining('private') },
  });
  expect(await runner.execute(['-e', 'setTimeout(() => {}, 10000)'], 20)).toMatchObject({
    ok: false,
    error: { code: 'network' },
  });
  expect(await createCommandRunner('/missing/yt-dlp').execute([], 1000)).toMatchObject({
    ok: false,
    error: { code: 'tools' },
  });
});
