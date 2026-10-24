import { _electron as electron, expect, test } from '@playwright/test';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { z } from 'zod';
import { resolve } from 'node:path';
import { catalogueViewSchema } from '../../src/shared/catalogue';
import { researchResultSchema } from '../../src/shared/researchCommands';
import { identityResponse, releaseResponse } from '../discogsFixtures';

test('researches verified release tracks through MCP and preserves visible provenance after restart', async () => {
  const options = {
    args: [
      resolve('tests/encryptedDesktop.cjs'),
      `--user-data-dir=${test.info().outputPath('profile')}`,
    ],
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          (entry): entry is [string, string] =>
            typeof entry[1] === 'string' && entry[0] !== 'ELECTRON_RUN_AS_NODE',
        ),
      ),
      AUTO_DIGGER_TEST_IDENTITY: '1',
    },
  };
  let desktop = await electron.launch(options);
  const client = new Client({ name: 'research-provenance-check', version: '1.0.0' });
  try {
    let page = await desktop.firstWindow();
    await desktop.evaluate(
      (_electron, fixture) => {
        globalThis.fetch = (input) => {
          const url = input instanceof Request ? input.url : input.toString();
          return Promise.resolve(
            new Response(
              JSON.stringify(
                url.endsWith('/oauth/identity')
                  ? fixture.identity
                  : url.includes('/database/search')
                    ? {
                        pagination: { page: 1, pages: 1, per_page: 50, items: 1 },
                        results: [
                          { id: 12, title: 'Low Tide - Quiet Orbit', format: ['Vinyl', 'EP'] },
                        ],
                      }
                    : fixture.release,
              ),
            ),
          );
        };
      },
      { identity: identityResponse, release: releaseResponse },
    );
    expect(
      await page.evaluate(async () => window.discogs?.connect('research-fixture-token')),
    ).toMatchObject({ ok: true });
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Enable research access', exact: true }).click();
    const access = await page.evaluate(async () => window.researchAccess?.status());
    if (!access?.ok) throw new Error('No research access');
    expect(JSON.stringify(access.value)).not.toContain('research-fixture-token');
    await client.connect(new StdioClientTransport(access.value.configuration));
    expect(
      await client.callTool({
        name: 'search_releases',
        arguments: { query: 'Low Tide Quiet Orbit' },
      }),
    ).toMatchObject({ isError: false });
    expect(
      await client.callTool({ name: 'get_release', arguments: { releaseId: 12 } }),
    ).toMatchObject({ isError: false });
    const created = z
      .object({ result: researchResultSchema })
      .parse(
        (await client.callTool({ name: 'create_crate', arguments: { name: 'H-Foundation picks' } }))
          .structuredContent,
      ).result;
    if (!created.ok) throw new Error('No crate');
    const view = catalogueViewSchema.parse(created.value);
    const crateId = view.crateId;
    if (!crateId) throw new Error('No crate ID');
    const added = z
      .object({ result: researchResultSchema })
      .parse(
        (await client.callTool({ name: 'add_release', arguments: { crateId, releaseId: 12 } }))
          .structuredContent,
      ).result;
    if (!added.ok) throw new Error('No release');
    const trackKey = catalogueViewSchema.parse(added.value).entries[0]?.tracks[0]?.key;
    if (!trackKey) throw new Error('No saved track');
    await page.getByRole('button', { name: 'Crates', exact: true }).click();
    await page.getByRole('combobox', { name: 'Active crate' }).selectOption(crateId);
    await expect(page.getByLabel('Pick Quiet Orbit', { exact: true })).not.toBeChecked();
    expect(
      await client.callTool({
        name: 'annotate_track',
        arguments: { crateId, releaseId: 12, trackKey, picked: true, tags: ['dub', 'warm-up'] },
      }),
    ).toMatchObject({ isError: false });
    await expect(page.getByLabel('Pick Quiet Orbit', { exact: true })).toBeChecked();
    await expect(page.getByLabel('Tags for Quiet Orbit', { exact: true })).toHaveValue(
      'dub, warm-up',
    );
    const evidence = {
      crateId,
      releaseId: 12,
      trackKey,
      title: 'Quiet Orbit',
      artist: 'Low Tide',
      mixUrl: 'https://www.youtube.com/watch?v=mixfixture1',
      sourceUrls: ['https://www.discogs.com/release/12'],
      trackNumber: 3,
      timestamp: '00:31:20',
      certainty: 'confirmed',
      notes: 'Original EP; recording version checked.',
    };
    expect(await client.callTool({ name: 'save_research', arguments: evidence })).toMatchObject({
      isError: false,
    });
    expect(
      await client.callTool({
        name: 'save_research',
        arguments: {
          ...evidence,
          releaseId: null,
          trackKey: null,
          title: 'Unidentified track',
          artist: '',
          sourceUrls: [],
          trackNumber: 4,
          certainty: 'unresolved',
        },
      }),
    ).toMatchObject({ isError: false });
    const research = page.getByRole('region', { name: 'Research notes' });
    await expect(research.getByText('Confirmed', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Pick Quiet Orbit', { exact: true })).toBeInViewport();
    await expect(research.getByText('Unresolved', { exact: true })).toBeVisible();
    await expect(research.getByText('00:31:20', { exact: true }).first()).toBeVisible();
    await desktop.evaluate(({ shell }) => {
      shell.openExternal = (url) => {
        process.env.AUTO_DIGGER_OPENED_EVIDENCE = url;
        return Promise.resolve();
      };
    });
    await research
      .getByRole('button', { name: 'Open mix source for Quiet Orbit', exact: true })
      .click();
    expect(await desktop.evaluate(() => process.env.AUTO_DIGGER_OPENED_EVIDENCE)).toBe(
      evidence.mixUrl,
    );
    await research
      .getByRole('button', { name: 'Open source 1 for Quiet Orbit', exact: true })
      .click();
    expect(await desktop.evaluate(() => process.env.AUTO_DIGGER_OPENED_EVIDENCE)).toBe(
      evidence.sourceUrls[0],
    );
    expect(
      JSON.stringify(await client.callTool({ name: 'get_crate', arguments: { crateId } })),
    ).not.toContain('research-fixture-token');
    await client.close();
    await desktop.close();
    desktop = await electron.launch(options);
    page = await desktop.firstWindow();
    await page.getByRole('button', { name: 'Crates', exact: true }).click();
    await page.getByRole('combobox', { name: 'Active crate' }).selectOption(crateId);
    await expect(page.getByLabel('Pick Quiet Orbit', { exact: true })).toBeChecked();
    await expect(
      page.getByRole('region', { name: 'Research notes' }).getByText('Unresolved', { exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(async () => window.researchAccess?.status())).toMatchObject({
      ok: true,
      value: { enabled: false },
    });
    await page.screenshot({ path: 'test-results/research-crate.png' });
  } finally {
    await client.close();
    await desktop.close();
  }
});
