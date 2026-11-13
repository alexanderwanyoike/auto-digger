import { useState } from 'react';
import type { CrateError } from '../../shared/crate';
import type { DiscogsRelease } from '../../shared/discogs';
import { isEp } from '../../shared/is-ep';
import { CratePicker } from './CratePicker';
import type { useCrate } from './use-crate';

export function SaveToCrate({
  release,
  crate,
  showDestination = false,
}: {
  release: DiscogsRelease;
  crate: ReturnType<typeof useCrate>;
  showDestination?: boolean;
}) {
  const saved = crate.releases.some((item) => item.id === release.id);
  const ep = isEp(release.formats);
  const [selectionError, setSelectionError] = useState<CrateError | null>(null);
  const destinationError = showDestination ? crate.error : null;
  return (
    <div className="save-to-crate">
      {showDestination && (
        <CratePicker crate={crate} label="Save to crate" onSelection={setSelectionError} />
      )}
      <button
        type="button"
        className="secondary-button"
        disabled={
          (!ep && !crate.catalogue.available) ||
          saved ||
          !crate.ready ||
          crate.busy ||
          (destinationError !== null && destinationError === selectionError) ||
          (crate.catalogue.available && !crate.catalogue.view.crateId)
        }
        onClick={() => {
          crate.save(release).catch(() => undefined);
        }}
      >
        {saved ? 'Saved to crate' : `${ep ? 'Save EP' : 'Save release'} to crate`}
      </button>
      {destinationError && (
        <span role="alert" className="crate-destination-error">
          {destinationError.message}
        </span>
      )}
      {!ep && !crate.catalogue.available && <span>The crate supports EP releases.</span>}
    </div>
  );
}
