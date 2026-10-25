import { useState } from 'react';
import { ArrowRight, SlidersHorizontal } from 'lucide-react';
import { TaxonomySelect } from './TaxonomySelect';
import { GenreStyleFilters } from './GenreStyleFilters';
import type { DigFilters } from '../../shared/search';
import { releaseTypes } from '../../shared/releaseTypes';
import type { useDiscogs } from '../discogs/useDiscogs';

const fields = [
  ['label', 'Label', 'Any label'],
  ['artist', 'Artist', 'Any artist'],
  ['year', 'Year', '1998 or 1990-1999'],
  ['title', 'Release title', 'Any release title'],
] as const;

export function FilterPanel({ session }: { session: ReturnType<typeof useDiscogs> }) {
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  return (
    <aside className="filter-panel" aria-labelledby="filters-heading">
      <div className="panel-heading">
        <h2 id="filters-heading">
          <SlidersHorizontal size={15} aria-hidden="true" /> The starting point
        </h2>
      </div>
      <div className="desk-panel-scroll">
        <p className="panel-description">Set the boundaries. Leave room for a surprise.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const value = (name: string) => {
              const field = data.get(name);
              return typeof field === 'string' ? field.trim() : '';
            };
            const selected = (name: string) =>
              data
                .getAll(name)
                .flatMap((field) =>
                  typeof field === 'string' && field.trim() ? [field.trim()] : [],
                );
            const filters: DigFilters = {
              label: value('label'),
              artist: value('artist'),
              year: value('year'),
              genre: selected('genre'),
              style: selected('style'),
              format: selected('format'),
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
                    maxLength={name === 'year' ? 9 : 160}
                    pattern={name === 'year' ? '[0-9]{4}(-[0-9]{4})?' : undefined}
                    inputMode="text"
                  />
                </span>
              </label>
            ))}
            <GenreStyleFilters disabled={!session.account || session.busy} />
            <TaxonomySelect
              name="format"
              value={selectedFormats}
              onChange={setSelectedFormats}
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
