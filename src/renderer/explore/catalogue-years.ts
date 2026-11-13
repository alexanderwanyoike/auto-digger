import type { DiscogsBridge, DiscogsResult } from '../../shared/discogs';
import { discogsFailure } from '../../shared/discogs-failure';
import { emptyFilters } from '../../shared/default-filters';
import { stylesForGenres } from '../../shared/genre-styles';
import type { SearchPage } from '../../shared/search';

export const firstSearchYear = 1000;
export const lastSearchYear = 9999;

export function catalogueStyles(preferred: readonly string[]) {
  const usable = preferred.filter(
    (style) => style.trim() && style.length <= 160 && !style.includes('|'),
  );
  return [...new Set([...usable, ...stylesForGenres([])])];
}

export async function catalogueYear(
  search: DiscogsBridge['search'],
  style: string,
  start: number,
  end: number,
  order: 'oldest' | 'newest',
  background = false,
): Promise<DiscogsResult<number | null>> {
  if (start > end) return { ok: true, value: null };
  const result = await search({
    filters: {
      ...emptyFilters,
      style: [style],
      year: `${start.toString()}-${end.toString()}`,
    },
    page: 1,
    context: 'catalogue',
    order,
    background,
  });
  if (!result.ok) return result;
  if (!result.value.items) return { ok: true, value: null };
  const years = result.value.releases
    .map(({ year }) => Number(year))
    .filter((year) => Number.isInteger(year) && year >= start && year <= end);
  if (!years.length)
    return discogsFailure('invalid-response', 'Discogs did not return a release year.');
  return { ok: true, value: order === 'oldest' ? Math.min(...years) : Math.max(...years) };
}

export async function catalogueYears(
  search: DiscogsBridge['search'],
  style: string,
  from: number,
  yearLimit: number,
  active: () => boolean,
  onYear: (year: number) => void,
): Promise<DiscogsResult<number | null>> {
  async function next(start: number, remaining: number): Promise<DiscogsResult<number | null>> {
    if (!active() || start > lastSearchYear) return { ok: true, value: null };
    if (remaining === 0) return { ok: true, value: start };
    const result = await catalogueYear(
      search,
      style,
      start,
      lastSearchYear,
      'oldest',
      start !== firstSearchYear,
    );
    if (!result.ok) return result;
    if (!active() || result.value === null) return { ok: true, value: null };
    onYear(result.value);
    return next(result.value + 1, remaining - 1);
  }
  return next(from, yearLimit);
}

export function recordsForYear(
  search: DiscogsBridge['search'],
  style: string,
  year: number,
  page: number,
  background = false,
): Promise<DiscogsResult<SearchPage>> {
  return search({
    filters: { ...emptyFilters, style: [style], year: year.toString() },
    page,
    context: 'catalogue',
    background,
  });
}
