import { apiRecommendationInputSchema } from '../../shared/api-feasibility-prototype';
import type {
  ApiPrototypeResult,
  ApiRecommendationRelease,
} from '../../shared/api-feasibility-prototype';
import { releaseMetadataSchema } from '../discogs/release-metadata';

function normalise(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export async function loadRecommendationRelease(
  input: unknown,
  fetcher: typeof fetch = fetch,
): Promise<ApiPrototypeResult<ApiRecommendationRelease>> {
  const parsed = apiRecommendationInputSchema.safeParse(input);
  const invalid = {
    ok: false as const,
    error: {
      code: 'invalid-input' as const,
      message: 'Choose a recommendation with a specific Discogs release link.',
    },
  };
  if (!parsed.success) return invalid;
  let id: number;
  try {
    const url = new URL(parsed.data.sourceUrl);
    if (
      url.protocol !== 'https:' ||
      !['discogs.com', 'www.discogs.com'].includes(url.hostname) ||
      url.port ||
      url.username ||
      url.password
    )
      return invalid;
    const match = /^\/release\/([1-9][0-9]*)(?:-[^/]*)?\/?$/.exec(url.pathname);
    id = Number(match?.[1]);
    if (!Number.isSafeInteger(id) || id < 1) return invalid;
  } catch {
    return invalid;
  }
  try {
    const response = await fetcher(`https://api.discogs.com/releases/${id.toString()}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AutoDigger-Prototype/0.1 (https://github.com/alexanderwanyoike/auto-digger)',
      },
      signal: AbortSignal.timeout(10000),
      redirect: 'error',
    });
    if (!response.ok)
      return {
        ok: false,
        error: {
          code: response.status === 429 ? 'rate-limited' : 'unavailable',
          httpStatus: response.status,
          message:
            'Discogs could not load the linked release. Your recommendations are still available.',
        },
      };
    const body: unknown = await response.json();
    const result = releaseMetadataSchema.safeParse(body);
    if (!result.success || result.data.id !== id)
      return {
        ok: false,
        error: {
          code: 'invalid-response',
          message: 'Discogs metadata did not match the linked release.',
        },
      };
    const release = result.data;
    const exact = release.tracks.flatMap((track, index) =>
      normalise(track.title) === normalise(parsed.data.title) ? [index] : [],
    );
    const artistMatches = release.artists.some(
      (artist) => normalise(artist) === normalise(parsed.data.artist),
    );
    return {
      ok: true,
      value: {
        release,
        trackIndex: artistMatches && exact.length === 1 ? (exact[0] ?? null) : null,
      },
    };
  } catch {
    return {
      ok: false,
      error: {
        code: 'unavailable',
        message: 'The linked release could not be read. Your recommendations are still available.',
      },
    };
  }
}
