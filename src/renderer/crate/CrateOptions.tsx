import { useState } from 'react';
import type { CatalogueView } from '../../shared/catalogue';
import type { useCrate } from './useCrate';

export function CrateOptions({
  active,
  crate,
}: {
  active: CatalogueView['crates'][number];
  crate: ReturnType<typeof useCrate>;
}) {
  const [rename, setRename] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { catalogue } = crate;
  return (
    <details className="crate-options">
      <summary>Manage {active.name}</summary>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          catalogue
            .perform((api) => api.rename({ crateId: active.id, name: rename }))
            .catch(() => undefined);
        }}
      >
        <label htmlFor="rename-crate">
          Rename crate
          <input
            id="rename-crate"
            value={rename}
            required
            maxLength={80}
            placeholder={active.name}
            onChange={(event) => {
              setRename(event.target.value);
            }}
          />
        </label>
        <button type="submit" className="secondary-button" disabled={crate.busy}>
          Rename
        </button>
      </form>
      {!confirmDelete ? (
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            setConfirmDelete(true);
          }}
        >
          Delete crate
        </button>
      ) : (
        <div role="group" aria-label="Confirm crate deletion">
          <p>Delete this crate and its picks? Your downloads stay in the library.</p>
          <button
            type="button"
            className="secondary-button"
            disabled={crate.busy}
            onClick={() => {
              catalogue
                .perform((api) => api.deleteCrate(active.id))
                .then(() => {
                  setConfirmDelete(false);
                })
                .catch(() => undefined);
            }}
          >
            Confirm delete crate
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setConfirmDelete(false);
            }}
          >
            Keep crate
          </button>
        </div>
      )}
    </details>
  );
}
