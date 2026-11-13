import type { DiscogsBridge, DiscogsResult } from '../../shared/discogs';
import { discogsFailure } from '../../shared/discogs-failure';
import { emptyFilters } from '../../shared/default-filters';
import { stylesForGenres } from '../../shared/genre-styles';
import type { SearchPage } from '../../shared/search';

export const firstSearchYear = 1000;

export function catalogueStyles(preferred: readonly string[]) {
  const usable = preferred.filter(
    (style) => style.trim() && style.length <= 160 && !style.includes('|'),
  );
  return [...new Set([...usable, ...stylesForGenres([])])];
}

export async function catalogueYears(
  search: DiscogsBridge['search'],
  style: string,
  from: number,
  yearLimit: number,
  active: () => boolean,
  onYear: (year: number) => void,
): Promise<DiscogsResult<number | null>> {
  const latest = 9999;
  async function next(start: number, remaining: number): Promise<DiscogsResult<number | null>> {
    if (!active() || start > latest) return { ok: true, value: null };
    if (remaining === 0) return { ok: true, value: start };
    const result = await search({
      filters: {
        ...emptyFilters,
        style: [style],
        year: `${start.toString()}-${latest.toString()}`,
      },
      page: 1,
      context: 'catalogue',
      order: 'oldest',
    });
    if (!result.ok) return result;
    if (!active() || result.value.items === 0) return { ok: true, value: null };
    const years = result.value.releases
      .map(({ year }) => Number(year))
      .filter((year) => Number.isInteger(year) && year >= start && year <= latest);
    if (!years.length)
      return discogsFailure('invalid-response', 'Discogs did not return a release year.');
    const first = Math.min(...years);
    onYear(first);
    return next(first + 1, remaining - 1);
  }
  return next(from, yearLimit);
}

export function recordsForYear(
  search: DiscogsBridge['search'],
  style: string,
  year: number,
  page: number,
): Promise<DiscogsResult<SearchPage>> {
  return search({
    filters: { ...emptyFilters, style: [style], year: year.toString() },
    page,
    context: 'catalogue',
  });
}
