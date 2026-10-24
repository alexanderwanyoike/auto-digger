import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, vi } from 'vitest';
import { createResearchRuntime } from './runtime';
import { callResearchApp } from '../../mcp/appClient';
import { researchConnectionSchema } from '../../shared/researchAccess';

test('only serves authorized local requests while enabled and revokes access on stop', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'auto-digger-mcp-runtime-'));
  const file = join(directory, 'mcp-connection.json');
  const execute = vi.fn().mockResolvedValue({ ok: true, value: [{ name: 'Research picks' }] });
  const runtime = createResearchRuntime(file, '/app/out/main/mcp.js', execute);
  try {
    expect(runtime.status().enabled).toBe(false);
    expect(await runtime.start()).toMatchObject({
      ok: true,
      value: {
        enabled: true,
        configuration: { command: 'node', args: ['/app/out/main/mcp.js', '--connection', file] },
      },
    });
    const connection = researchConnectionSchema.parse(JSON.parse(await readFile(file, 'utf8')));
    if (process.platform !== 'win32') expect((await stat(file)).mode % 0o100).toBe(0);
    const input = { name: 'list_crates', arguments: {} };
    const request = (headers: Record<string, string>, body = JSON.stringify(input)) =>
      fetch(connection.url, { method: 'POST', headers, body });
    expect((await request({})).status).toBe(401);
    expect(
      (await request({ Authorization: `Bearer ${connection.key}`, Origin: 'https://example.com' }))
        .status,
    ).toBe(403);
    expect(
      (await request({ Authorization: `Bearer ${connection.key}` }, 'x'.repeat(70_000))).status,
    ).toBe(413);
    expect(execute).not.toHaveBeenCalled();
    expect(await callResearchApp(file, input)).toMatchObject({
      ok: true,
      value: [{ name: 'Research picks' }],
    });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(await runtime.stop()).toMatchObject({ ok: true, value: { enabled: false } });
    expect(await callResearchApp(file, input)).toMatchObject({
      ok: false,
      error: { code: 'unavailable' },
    });
    await expect(readFile(file)).rejects.toMatchObject({ code: 'ENOENT' });
  } finally {
    await runtime.stop();
    await rm(directory, { recursive: true, force: true });
  }
});
