import { expect, test } from 'vitest';
import { installerSuffixes, publishedDownloads } from './releaseAssets';

const assets = [
  ...Object.values(installerSuffixes).map((suffix) => `AutoDigger-0.1.1-${suffix}`),
  'SHA256SUMS',
].map((name) => ({
  name,
  size: 100,
  browser_download_url: `https://github.com/alexanderwanyoike/auto-digger/releases/download/v0.1.1/${name}`,
}));
const release = { tag_name: 'v0.1.1', draft: false, prerelease: false, assets };

test.each([
  { ...release, draft: true },
  { ...release, prerelease: true },
  { ...release, assets: assets.slice(1) },
  {
    ...release,
    assets: assets.map((asset) => ({
      ...asset,
      browser_download_url: asset.browser_download_url.replace('auto-digger/', 'another-app/'),
    })),
  },
  {
    ...release,
    assets: [
      ...assets,
      { ...assets[0], browser_download_url: 'https://example.com/installer.exe' },
    ],
  },
])('rejects unpublished, incomplete, foreign or ambiguous installer assets: %j', (input) => {
  expect(publishedDownloads(input).ok).toBe(false);
});
