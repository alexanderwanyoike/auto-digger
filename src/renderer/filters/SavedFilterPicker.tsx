import { useId, useState } from 'react';
import { BookmarkPlus, Trash2, X } from 'lucide-react';
import type { useSavedFilters } from './useSavedFilters';

export function SavedFilterPicker({ filters }: { filters: ReturnType<typeof useSavedFilters> }) {
  const controlId = useId();
  const [selected, setSelected] = useState('');
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const disabled = !filters.available || filters.busy;
  return (
    <div className="saved-filter-picker">
      <div className="saved-filter-controls">
        <label className="saved-filter-select" htmlFor={`${controlId}-presets`}>
          <span className="sr-only">Saved filters</span>
          <select
            id={`${controlId}-presets`}
            value={selected}
            disabled={disabled}
            onChange={(event) => {
              const id = event.target.value;
              setSelected(id);
              setNaming(false);
              const preset = filters.presets.find((item) => item.id === id);
              if (preset) filters.setDraft(preset.filters);
            }}
          >
            <option value="">Saved filters</option>
            {filters.presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="icon-button"
          aria-label="Save filters"
          title="Save filters"
          disabled={disabled}
          onClick={() => {
            setName(filters.presets.find((preset) => preset.id === selected)?.name ?? '');
            setNaming(true);
          }}
        >
          <BookmarkPlus size={15} aria-hidden="true" />
        </button>
        {selected && (
          <button
            type="button"
            className="icon-button"
            aria-label="Delete saved filters"
            title="Delete saved filters"
            disabled={disabled}
            onClick={() => {
              filters
                .remove(selected)
                .then((result) => {
                  if (result.ok) {
                    setSelected('');
                    setNaming(false);
                  }
                })
                .catch(() => undefined);
            }}
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      {naming && (
        <form
          className="saved-filter-name"
          onSubmit={(event) => {
            event.preventDefault();
            const current = filters.presets.find((preset) => preset.id === selected);
            filters
              .save(name, current?.name === name.trim() ? selected : undefined)
              .then((result) => {
                if (!result.ok) return;
                setSelected(
                  result.value.presets.find((preset) => preset.name === name.trim())?.id ?? '',
                );
                setNaming(false);
              })
              .catch(() => undefined);
          }}
        >
          <label htmlFor={`${controlId}-name`}>
            <span>Filter name</span>
            <input
              id={`${controlId}-name`}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
              maxLength={80}
              required
            />
          </label>
          <button type="submit" className="secondary-button" disabled={disabled || !name.trim()}>
            Save
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Cancel saving filters"
            onClick={() => {
              setNaming(false);
            }}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </form>
      )}
      {filters.error && (
        <p role="alert" className="filter-error">
          {filters.error}{' '}
          <button
            type="button"
            onClick={() => {
              filters.reload().catch(() => undefined);
            }}
          >
            Retry
          </button>
        </p>
      )}
    </div>
  );
}
