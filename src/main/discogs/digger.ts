import type { DiscogsRelease, DiscogsResult } from '../../shared/discogs';
import type { DigFilters, SearchPage } from '../../shared/search';
import type { DigResult } from '../../shared/dig';
import { discogsFailure } from '../../shared/discogs-failure';

type Search = (filters: DigFilters, page: number) => Promise<DiscogsResult<SearchPage>>;
type Load = (id: number) => Promise<DiscogsResult<DiscogsRelease>>;

export function createDigger(search: Search, load: Load, random = Math.random) {
  let key = '';
  let generation = 0;
  let pool: number[] = [];
  let total = 0;
  let limited = false;
  let perPage = 50;
  const pages = new Map<number, SearchPage>();
  const seen = new Set<number>();
  const reset = () => {
    generation += 1;
    key = '';
    pool = [];
    pages.clear();
    seen.clear();
  };
  async function draw(
    filters: DigFilters,
    started: number,
    attempts: number,
  ): Promise<DiscogsResult<DigResult>> {
    if (!pool.length)
      return discogsFailure(
        'exhausted',
        'No unseen releases remain in this search. Reset digging or change the filters.',
      );
    if (!attempts)
      return discogsFailure(
        'not-found',
        'These candidates were unavailable or no longer match your release types. Try Dig again.',
      );
    const pick = Math.floor(random() * pool.length);
    const position = pool[pick];
    const last = pool.pop();
    if (position === undefined || last === undefined)
      return discogsFailure('exhausted', 'No unseen releases remain.');
    if (pick < pool.length) pool[pick] = last;
    const page = Math.floor(position / perPage) + 1;
    let batch = pages.get(page);
    if (!batch) {
      const result = await search(filters, page);
      if (started !== generation)
        return discogsFailure('cancelled', 'The digging session has changed.');
      if (!result.ok) {
        pool.push(position);
        return result;
      }
      batch = result.value;
      pages.set(page, batch);
    }
    const candidate = batch.releases[position % perPage];
    if (candidate && !seen.has(candidate.id)) {
      const result = await load(candidate.id);
      if (started !== generation)
        return discogsFailure('cancelled', 'The digging session has changed.');
      if (!result.ok) {
        if (result.error.code !== 'not-found') {
          pool.push(position);
          return result;
        }
      } else if (
        !filters.format.length ||
        result.value.formats.some((format) =>
          format.split(',').some((part) => filters.format.includes(part.trim())),
        )
      ) {
        seen.add(candidate.id);
        return { ok: true, value: { release: result.value, seen: seen.size, total, limited } };
      }
    }
    return draw(filters, started, attempts - 1);
  }

  async function next(filters: DigFilters, restart = false): Promise<DiscogsResult<DigResult>> {
    const criteria = JSON.stringify(filters);
    if (restart || criteria !== key) reset();
    const started = generation;
    const cancelled = () => started !== generation;
    if (!key) {
      const first = await search(filters, 1);
      if (cancelled()) return discogsFailure('cancelled', 'The digging session has changed.');
      if (!first.ok) return first;
      const { value } = first;
      perPage = value.perPage;
      total = Math.min(value.items, value.pages * perPage, 10000);
      limited = value.items > total;
      pool = Array.from({ length: total }, (_, index) => index);
      pages.set(1, value);
      key = criteria;
    }
    return draw(filters, started, 10);
  }
  return {
    next,
    reset,
    apply: (filters: DigFilters) => {
      if (JSON.stringify(filters) !== key) reset();
    },
  };
}
