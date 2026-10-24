import { _electron as electron, expect, test } from '@playwright/test';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { VERSIONED_MANIFEST_SCHEMAS } from '@anthropic-ai/mcpb/schemas';
import { strFromU8, unzipSync } from 'fflate';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

test('exports an installable Claude extension that calls the existing local tools without app dependencies', async () => {
  const desktop = await electron.launch({
    args: [
      resolve('tests/encryptedDesktop.cjs'),
      `--user-data-dir=${test.info().outputPath('profile')}`,
    ],
    env: Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
      ),
    ),
  });
  const client = new Client({ name: 'extension-check', version: '1.0.0' });
  try {
    const page = await desktop.firstWindow();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Enable research access', exact: true }).click();
    const file = test.info().outputPath('Auto Digger.mcpb');
    await desktop.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = () => Promise.resolve({ canceled: false, filePath });
    }, file);
    await page.getByRole('button', { name: 'Save Claude extension', exact: true }).click();
    await expect(page.getByText('Extension saved. Install it in Claude Desktop.')).toBeVisible();
    const files = unzipSync(await readFile(file));
    const manifestBytes = files['manifest.json'];
    if (!manifestBytes) throw new Error('No manifest');
    const manifest = VERSIONED_MANIFEST_SCHEMAS['0.3'].parse(JSON.parse(strFromU8(manifestBytes)));
    expect(manifest.server.type).toBe('node');
    expect(manifest.server.mcp_config.command).toBe('node');
    expect(manifest.user_config).toBeUndefined();
    expect(Object.keys(files)).toContain('LICENSES.txt');
    const folder = test.info().outputPath('standalone extension');
    for (const [name, bytes] of Object.entries(files)) {
      expect(name).not.toMatch(/(^\/|\.\.)/);
      const path = join(folder, name);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, bytes);
    }
    await client.connect(
      new StdioClientTransport({
        command: process.execPath,
        args: (manifest.server.mcp_config.args ?? []).map((arg) =>
          arg.replaceAll('${__dirname}', folder),
        ),
        cwd: folder,
      }),
    );
    expect(
      await client.callTool({ name: 'create_crate', arguments: { name: 'Extension picks' } }),
    ).toMatchObject({ isError: false });
    await page.getByRole('button', { name: 'Crates', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Active crate' })).toContainText(
      'Extension picks',
    );
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Disable research access', exact: true }).click();
    expect(await client.callTool({ name: 'list_crates', arguments: {} })).toMatchObject({
      isError: true,
    });
  } finally {
    await client.close();
    await desktop.close();
  }
});
