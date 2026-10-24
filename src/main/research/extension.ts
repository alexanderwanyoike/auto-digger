import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { strToU8, zipSync } from 'fflate';
import metadata from '../../../package.json';
import type { CatalogueResult } from '../../shared/catalogue';
import { catalogueFailure } from '../../shared/catalogueFailure';

export async function createResearchExtension(
  connectionFile: string,
): Promise<CatalogueResult<Uint8Array>> {
  try {
    const root = join(import.meta.dirname, '../..');
    const [server, licences, icon, licence] = await Promise.all([
      readFile(join(root, 'out/extension/mcp.cjs')),
      readFile(join(root, 'out/extension/LICENSES.txt')),
      readFile(join(root, 'resources/icons/icon.png')),
      readFile(join(root, 'LICENSE')),
    ]);
    const manifest = {
      manifest_version: '0.3',
      name: 'auto-digger',
      display_name: 'Auto Digger',
      version: metadata.version,
      description: 'Research mixes and save Discogs releases and track picks to your crates.',
      author: { name: metadata.author },
      homepage: metadata.homepage,
      documentation: `${metadata.homepage}setup/`,
      license: 'MIT',
      icon: 'icon.png',
      server: {
        type: 'node',
        entry_point: 'server/index.cjs',
        mcp_config: {
          command: 'node',
          args: [`\${__dirname}/server/index.cjs`, '--connection', connectionFile],
        },
      },
      compatibility: { runtimes: { node: '>=20.0.0' } },
    };
    return {
      ok: true,
      value: zipSync({
        'manifest.json': strToU8(JSON.stringify(manifest, null, 2)),
        'server/index.cjs': server,
        'LICENSES.txt': licences,
        LICENSE: licence,
        'icon.png': icon,
      }),
    };
  } catch {
    return catalogueFailure(
      'storage',
      'The Claude extension could not be prepared. Please retry or reinstall Auto Digger.',
    );
  }
}
