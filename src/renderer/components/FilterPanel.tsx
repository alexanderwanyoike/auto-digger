import { ArrowRight, SlidersHorizontal } from 'lucide-react';
import type { DigFilters } from '../../shared/search';
import type { useDiscogs } from '../discogs/useDiscogs';

const fields = [
  ['label', 'Label', 'Any label'],
  ['artist', 'Artist', 'Any artist'],
  ['year', 'Year', 'Any year'],
  ['genre', 'Genre', 'All genres'],
  ['style', 'Style', 'All styles'],
  ['title', 'Release title', 'Any release title'],
] as const;

export function FilterPanel({ session }: { session: ReturnType<typeof useDiscogs> }) {
  return (
    <aside className="filter-panel" aria-labelledby="filters-heading">
      <div className="panel-heading">
        <h2 id="filters-heading">
          <SlidersHorizontal size={15} aria-hidden="true" /> The starting point
        </h2>
      </div>
      <p className="panel-description">Set the boundaries. Leave room for a surprise.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const value = (name: string) => {
            const field = data.get(name);
            return typeof field === 'string' ? field.trim() : '';
          };
          const filters: DigFilters = {
            label: value('label'),
            artist: value('artist'),
            year: value('year'),
            genre: value('genre') ? [value('genre')] : [],
            style: value('style') ? [value('style')] : [],
            title: value('title'),
          };
          session.search(filters).catch(() => undefined);
        }}
      >
        <fieldset disabled={!session.account || session.busy}>
          <legend className="sr-only">Digging filters</legend>
          {fields.map(([name, label, placeholder]) => (
            <label htmlFor={name} key={name}>
              <span>{label}</span>
              <span className="input-wrap">
                <input
                  id={name}
                  name={name}
                  placeholder={placeholder}
                  maxLength={name === 'year' ? 4 : 160}
                  pattern={name === 'year' ? '[0-9]{4}' : undefined}
                  inputMode={name === 'year' ? 'numeric' : 'text'}
                />
              </span>
            </label>
          ))}
          <div className="format-row">
            <span>Format</span>
            <span className="format-tag">EP</span>
          </div>
          <button className="primary-button" type="submit">
            Search EPs <ArrowRight size={15} aria-hidden="true" />
          </button>
        </fieldset>
      </form>
      <p className="phase-note">
        Use any Discogs genre or style. Leave fields blank to search widely.
      </p>
      <div className="source-card">
        <span className="eyebrow">THE SOURCE</span>
        <div className="source-name">
          <span className="small-record" aria-hidden="true" /> Discogs
        </div>
        <p>{session.account ? 'Connected for this session.' : 'Connect your Discogs account.'}</p>
      </div>
    </aside>
  );
}
