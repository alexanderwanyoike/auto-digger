import { ArrowRight, SlidersHorizontal } from 'lucide-react';
import type { useSavedFilters } from '../filters/useSavedFilters';
import { SavedFilterPicker } from '../filters/SavedFilterPicker';
import { TaxonomySelect } from './TaxonomySelect';
import { GenreStyleFilters } from './GenreStyleFilters';
import { releaseTypes } from '../../shared/releaseTypes';
import type { useDiscogs } from '../discogs/useDiscogs';

const fields = [
  ['label', 'Label', 'Any label'],
  ['artist', 'Artist', 'Any artist'],
  ['year', 'Year', '1998 or 1990-1999'],
  ['title', 'Release title', 'Any release title'],
] as const;

export function FilterPanel({
  session,
  filters,
}: {
  session: ReturnType<typeof useDiscogs>;
  filters: ReturnType<typeof useSavedFilters>;
}) {
  return (
    <aside className="filter-panel" aria-labelledby="filters-heading">
      <div className="panel-heading">
        <h2 id="filters-heading">
          <SlidersHorizontal size={15} aria-hidden="true" /> The starting point
        </h2>
      </div>
      <div className="desk-panel-scroll">
        <SavedFilterPicker filters={filters} />
        <form
          onSubmit={(event) => {
            event.preventDefault();
            session.search(filters.draft).catch(() => undefined);
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
                    value={filters.draft[name]}
                    onChange={(event) => {
                      filters.setDraft({ ...filters.draft, [name]: event.target.value });
                    }}
                    maxLength={name === 'year' ? 9 : 160}
                    pattern={name === 'year' ? '[0-9]{4}(-[0-9]{4})?' : undefined}
                    inputMode="text"
                  />
                </span>
              </label>
            ))}
            <GenreStyleFilters
              disabled={!session.account || session.busy}
              genre={filters.draft.genre}
              style={filters.draft.style}
              onChange={(selection) => {
                filters.setDraft({ ...filters.draft, ...selection });
              }}
            />
            <TaxonomySelect
              name="format"
              value={filters.draft.format}
              onChange={(format) => {
                filters.setDraft({ ...filters.draft, format });
              }}
              label="Release type"
              options={releaseTypes}
              placeholder="All release types"
              disabled={!session.account || session.busy}
            />
            <button className="primary-button" type="submit">
              Search releases <ArrowRight size={15} aria-hidden="true" />
            </button>
          </fieldset>
        </form>
        <p className="phase-note">Match any selected type, genre or style within each field.</p>
      </div>
      <div className="source-card">
        <span className="eyebrow">THE SOURCE</span>
        <div className="source-name">
          <span className="small-record" aria-hidden="true" /> Discogs
        </div>
        <p>
          {session.account ? 'Account remembered on this device.' : 'Connect your Discogs account.'}
        </p>
      </div>
    </aside>
  );
}
