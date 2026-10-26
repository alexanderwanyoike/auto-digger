import type { useCrate } from './use-crate';

export function CratePicker({ crate }: { crate: ReturnType<typeof useCrate> }) {
  const { catalogue } = crate;
  if (!catalogue.available) return null;
  return (
    <label className="crate-picker" htmlFor="active-crate">
      Active crate
      <select
        id="active-crate"
        value={catalogue.view.crateId ?? ''}
        disabled={catalogue.busy}
        onChange={(event) => {
          const id = event.target.value;
          catalogue.perform((api) => api.view(id)).catch(() => undefined);
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
