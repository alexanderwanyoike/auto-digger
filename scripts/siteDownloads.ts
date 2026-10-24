import { readFile } from 'node:fs/promises';
import type { Plugin } from 'vite';
import { publishedDownloads } from '../src/shared/releaseAssets';

export function siteDownloads(): Plugin {
  return {
    name: 'published-installer-links',
    async transformIndexHtml(html) {
      const file = process.env.AUTO_DIGGER_RELEASE_JSON;
      if (!file) return html;
      const input: unknown = JSON.parse(await readFile(file, 'utf8'));
      const result = publishedDownloads(input);
      if (!result.ok) throw new Error(result.error);
      const { version, links } = result.value;
      return html
        .replace(
          /(<div data-download="([a-z0-9-]+)">)[\s\S]*?(<\/div>)/g,
          (match: string, start: string, target: string, end: string) => {
            const url = links[target];
            if (!url) return match;
            const label =
              target === 'macos-arm64' ? 'Apple silicon' : target === 'macos-x64' ? 'Intel' : 'x64';
            return `${start}<a class="download-button" href="${url}" aria-label="Download ${target}">${label} <span aria-hidden="true">↓</span></a>${end}`;
          },
        )
        .replace(
          /(<p[^>]* data-release-status>)[\s\S]*?(<\/p>)/,
          `$1Version ${version}. <a href="${links.checksums}">SHA-256 checksums</a>.$2`,
        );
    },
  };
}
