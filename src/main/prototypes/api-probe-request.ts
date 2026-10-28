import type { ApiProbeInput, ApiPrototypeResult } from '../../shared/api-feasibility-prototype';

export function apiProbeRequest(
  input: ApiProbeInput,
): ApiPrototypeResult<{ url: string; method: 'GET' | 'POST' }> {
  const { provider, operation, query, startYear, endYear } = input;
  if (startYear !== undefined && endYear !== undefined && startYear > endYear)
    return {
      ok: false,
      error: { code: 'invalid-input', message: 'The first year must not follow the last year.' },
    };
  if (
    (startYear !== undefined || endYear !== undefined) &&
    !(provider === 'cosine' && operation === 'similar')
  )
    return {
      ok: false,
      error: {
        code: 'unsupported',
        message: 'Year filters are verified only for Cosine similar tracks in this experiment.',
      },
    };
  if (provider === 'bandcamp') {
    if (operation !== 'account')
      return {
        ok: false,
        error: {
          code: 'unsupported',
          message: 'Bandcamp documents account APIs, not a public catalogue search API.',
        },
      };
    return {
      ok: true,
      value: { url: 'https://bandcamp.com/api/account/1/my_bands', method: 'POST' },
    };
  }
  if (operation === 'search' && (query.length < 2 || query.length > 200))
    return {
      ok: false,
      error: {
        code: 'invalid-input',
        message: 'Enter a search query between 2 and 200 characters.',
      },
    };
  if (provider === 'beatport') {
    if (operation !== 'search')
      return {
        ok: false,
        error: {
          code: 'unsupported',
          message: 'This Beatport experiment checks release search only.',
        },
      };
    const url = new URL('https://api.beatport.com/v4/catalog/search/');
    url.search = new URLSearchParams({ q: query, type: 'releases', per_page: '10' }).toString();
    return { ok: true, value: { url: url.href, method: 'GET' } };
  }
  if (operation === 'account')
    return {
      ok: false,
      error: {
        code: 'unsupported',
        message: 'Choose Cosine search, URL lookup or similar tracks.',
      },
    };
  if (operation === 'similar' && !/^[\w-]{1,100}$/.test(query))
    return {
      ok: false,
      error: {
        code: 'invalid-input',
        message: 'Choose a Cosine track ID from a search or lookup result.',
      },
    };
  if (operation === 'lookup') {
    try {
      const seed = new URL(query);
      if (
        seed.protocol !== 'https:' ||
        seed.username ||
        seed.password ||
        !/(^|\.)(youtube\.com|youtu\.be|discogs\.com|bandcamp\.com|soundcloud\.com)$/.test(
          seed.hostname,
        )
      )
        return {
          ok: false,
          error: {
            code: 'invalid-input',
            message: 'Paste a public HTTPS YouTube, Discogs, Bandcamp or SoundCloud track link.',
          },
        };
    } catch {
      return {
        ok: false,
        error: { code: 'invalid-input', message: 'Paste a complete track URL for lookup.' },
      };
    }
  }
  let path = 'search';
  if (operation === 'similar') path = `tracks/${encodeURIComponent(query)}/similar`;
  if (operation === 'lookup') path = 'tracks/lookup';
  const url = new URL(`https://cosine.club/api/v1/${path}`);
  if (operation !== 'similar') url.searchParams.set(operation === 'lookup' ? 'url' : 'q', query);
  if (operation !== 'lookup') {
    url.searchParams.set('limit', '10');
    url.searchParams.set('page', '1');
  }
  if (startYear !== undefined) url.searchParams.set('start_year', String(startYear));
  if (endYear !== undefined) url.searchParams.set('end_year', String(endYear));
  return { ok: true, value: { url: url.href, method: 'GET' } };
}
