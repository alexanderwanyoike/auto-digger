import { _electron as electron, expect, test } from '@playwright/test';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const environment = () =>
  Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
    ),
  );

test('enables a real stdio MCP client, reflects created crates and revokes its tools on disable', async () => {
  const desktop = await electron.launch({
    args: [
      resolve('tests/encrypted-desktop.cjs'),
      `--user-data-dir=${test.info().outputPath('profile')}`,
    ],
    env: environment(),
  });
  const client = new Client({ name: 'auto-digger-native-check', version: '1.0.0' });
  try {
    const page = await desktop.firstWindow();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Enable MCP', exact: true }).click();
    const access = await page.evaluate(async () => window.researchAccess?.status());
    if (!access?.ok || !access.value.enabled) throw new Error('No research access');
    await page.getByText('Codex and other local clients', { exact: true }).click();
    const configuration = page.getByLabel('MCP client configuration');
    await expect(configuration).toHaveValue(/mcp_servers.auto_digger/);
    await client.connect(new StdioClientTransport(access.value.configuration));
    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
      'add_release',
      'annotate_track',
      'create_crate',
      'get_crate',
      'get_release',
      'list_crates',
      'save_research',
      'search_releases',
    ]);
    expect(
      await client.callTool({ name: 'create_crate', arguments: { name: 'H-Foundation picks' } }),
    ).toMatchObject({ isError: false });
    await page.getByRole('button', { name: 'Crates', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Active crate' })).toContainText(
      'H-Foundation picks',
    );
    const duplicate = spawn(
      desktop.process().spawnfile,
      [
        '--no-sandbox',
        resolve('tests/encrypted-desktop.cjs'),
        `--user-data-dir=${test.info().outputPath('profile')}`,
      ],
      { env: environment(), stdio: 'ignore' },
    );
    try {
      await expect
        .poll(() => ({ code: duplicate.exitCode, signal: duplicate.signalCode }))
        .toEqual({ code: 0, signal: null });
      expect(await client.callTool({ name: 'list_crates', arguments: {} })).toMatchObject({
        isError: false,
      });
    } finally {
      duplicate.kill();
    }
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Disable MCP', exact: true }).click();
    expect(await client.callTool({ name: 'list_crates', arguments: {} })).toMatchObject({
      isError: true,
    });
    expect(await page.evaluate(async () => window.researchAccess?.status())).toMatchObject({
      ok: true,
      value: { enabled: false },
    });
  } finally {
    await client.close();
    await desktop.close();
  }
});
