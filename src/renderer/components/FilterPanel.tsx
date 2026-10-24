import { ArrowRight, ChevronDown, SlidersHorizontal } from 'lucide-react';

export function FilterPanel() {
  return (
    <aside className="filter-panel" aria-labelledby="filters-heading">
      <div className="panel-heading">
        <h2 id="filters-heading">
          <SlidersHorizontal size={15} aria-hidden="true" /> The starting point
        </h2>
      </div>
      <p className="panel-description" id="filters-notice">
        Set the boundaries. Leave room for a surprise.
      </p>
      <fieldset disabled aria-describedby="filter-phase">
        <legend className="sr-only">Digging filters</legend>
        <label htmlFor="label">
          <span>Label</span>
          <span className="input-wrap">
            <input id="label" placeholder="Any label" />
            <ChevronDown size={13} />
          </span>
        </label>
        <label htmlFor="artist">
          <span>Artist</span>
          <span className="input-wrap">
            <input id="artist" placeholder="Any artist" />
            <ChevronDown size={13} />
          </span>
        </label>
        <label htmlFor="year">
          <span>Year</span>
          <span className="input-wrap">
            <input id="year" placeholder="Any year" inputMode="numeric" />
            <ChevronDown size={13} />
          </span>
        </label>
        <div className="filter-divider" />
        <label htmlFor="genre">
          <span>Genre</span>
          <span className="input-wrap">
            <input id="genre" placeholder="All genres" />
            <ChevronDown size={13} />
          </span>
        </label>
        <label htmlFor="style">
          <span>Style</span>
          <span className="input-wrap">
            <input id="style" placeholder="All styles" />
            <ChevronDown size={13} />
          </span>
        </label>
        <div className="format-row">
          <span>Format</span>
          <span className="format-tag">EP</span>
        </div>
        <button className="primary-button" type="button">
          Start digging <ArrowRight size={15} />
        </button>
      </fieldset>
      <p className="phase-note" id="filter-phase">
        Filters come in Phase 3.
      </p>
      <div className="source-card">
        <span className="eyebrow">THE SOURCE</span>
        <div className="source-name">
          <span className="small-record" aria-hidden="true" /> Discogs
        </div>
        <p>Discogs connection comes in Phase 2.</p>
      </div>
    </aside>
  );
}
