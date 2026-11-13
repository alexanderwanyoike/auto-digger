import { useId } from 'react';
import type { CrateError } from '../../shared/crate';
import type { useCrate } from './use-crate';

export function CratePicker({
  crate,
  label = 'Active crate',
  onSelection,
}: {
  crate: ReturnType<typeof useCrate>;
  label?: string;
  onSelection?: (error: CrateError | null) => void;
}) {
  const pickerId = useId();
  const { catalogue } = crate;
  if (!catalogue.available) return null;
  return (
    <label className="crate-picker" htmlFor={pickerId}>
      {label}
      <select
        id={pickerId}
        value={catalogue.view.crateId ?? ''}
        disabled={catalogue.busy}
        onChange={(event) => {
          const id = event.target.value;
          catalogue
            .perform((api) => api.view(id))
            .then((result) => {
              onSelection?.(result.ok ? null : result.error);
            })
            .catch(() => undefined);
        }}
      >
        {!catalogue.view.crates.length && <option value="">Create a crate first</option>}
        {catalogue.view.crates.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} ({item.releaseCount})
          </option>
        ))}
      </select>
    </label>
  );
}
