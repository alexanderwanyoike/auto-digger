import { useState } from 'react';
import type { useSavedFilters } from '../filters/useSavedFilters';
import { SavedFilterPicker } from '../filters/SavedFilterPicker';
import { filtersSchema } from '../../shared/search';
import { ArrowRight, SlidersHorizontal } from 'lucide-react';
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
  const [yearError, setYearError] = useState<string | null>(null);
  return (
    <aside className="filter-panel" aria-labelledby="filters-heading">
      <div className="panel-heading">
        <h2 id="filters-heading">
          <SlidersHorizontal size={15} aria-hidden="true" /> The starting point
        </h2>
      </div>
      <div className="desk-panel-scroll">
        <p className="panel-description">Set the boundaries. Leave room for a surprise.</p>
        <SavedFilterPicker filters={filters} />
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = filtersSchema.safeParse(filters.draft);
            if (!parsed.success) {
              setYearError(
                'Use a year such as 1998 or a range such as 1990-1999, with the earlier year first.',
              );
              return;
            }
            setYearError(null);
            session.search(parsed.data).catch(() => undefined);
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
                      if (name === 'year') setYearError(null);
                    }}
                    aria-invalid={name === 'year' && Boolean(yearError)}
                    aria-describedby={name === 'year' && yearError ? 'year-error' : undefined}
                    maxLength={name === 'year' ? 9 : 160}
                    pattern={name === 'year' ? '[0-9]{4}(-[0-9]{4})?' : undefined}
                    inputMode="text"
                  />
                </span>
              </label>
            ))}
            {yearError && (
              <p id="year-error" role="alert" className="filter-error">
                {yearError}
              </p>
            )}
            <GenreStyleFilters
              disabled={!session.account || session.busy}
              genre={filters.draft.genre}
              style={filters.draft.style}
              onChange={(selection) => filters.setDraft({ ...filters.draft, ...selection })}
            />
            <TaxonomySelect
              name="format"
              value={filters.draft.format}
              onChange={(format) => filters.setDraft({ ...filters.draft, format })}
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
