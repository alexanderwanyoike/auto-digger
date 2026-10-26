import semver from 'semver';
import { publishedDownloads } from '../../shared/release-assets';
import type { UpdateBackend } from './service';

export function createMacUpdateBackend(
  currentVersion: string,
  architecture: string,
  request: typeof fetch,
  open: (url: string) => Promise<void>,
): UpdateBackend {
  let installer: string | undefined;
  return {
    manual: true,
    async check() {
      try {
        const response = await request(
          'https://api.github.com/repos/alexanderwanyoike/auto-digger/releases/latest',
          {
            headers: {
              Accept: 'application/vnd.github+json',
              'User-Agent': `Auto-Digger/${currentVersion}`,
            },
            signal: AbortSignal.timeout(15_000),
            redirect: 'error',
          },
        );
        if (response.status === 404) {
          installer = undefined;
          return { ok: true, value: null };
        }
        if (!response.ok)
          return { ok: false, error: 'Could not check for updates. Please try again later.' };
        const input: unknown = await response.json();
        const release = publishedDownloads(input);
        if (!release.ok)
          return {
            ok: false,
            error: 'The latest release is not ready to download. Please try again later.',
          };
        if (!semver.gt(release.value.version, currentVersion)) {
          installer = undefined;
          return { ok: true, value: null };
        }
        const candidate = release.value.links[`macos-${architecture}`];
        if (candidate) installer = candidate;
        return candidate
          ? { ok: true, value: release.value.version }
          : { ok: false, error: 'No installer is available for this Mac.' };
      } catch {
        return {
          ok: false,
          error: 'Could not check for updates. Check your connection and try again.',
        };
      }
    },
    async download() {
      if (!installer) return { ok: false, error: 'Check for an available update first.' };
      try {
        await open(installer);
        return { ok: true, value: undefined };
      } catch {
        return { ok: false, error: 'The installer could not open. Please retry.' };
      }
    },
    install: () =>
      Promise.resolve({
        ok: false,
        error: 'Open the downloaded installer to update Auto Digger on this Mac.',
      }),
  };
}
