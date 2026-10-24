import type { DiscogsRelease } from '../../shared/discogs';
import { isEp } from '../../shared/isEp';
import type { useCrate } from './useCrate';

export function SaveToCrate({
  release,
  crate,
}: {
  release: DiscogsRelease;
  crate: ReturnType<typeof useCrate>;
}) {
  const saved = crate.releases.some((item) => item.id === release.id);
  const ep = isEp(release.formats);
  return (
    <div className="save-to-crate">
      <button
        type="button"
        className="secondary-button"
        disabled={
          (!ep && !crate.catalogue.available) ||
          saved ||
          !crate.ready ||
          crate.busy ||
          (crate.catalogue.available && !crate.catalogue.view.crateId)
        }
        onClick={() => {
          crate.save(release).catch(() => undefined);
        }}
      >
        {saved ? 'Saved to crate' : `${ep ? 'Save EP' : 'Save release'} to crate`}
      </button>
      {!ep && !crate.catalogue.available && <span>The crate supports EP releases.</span>}
    </div>
  );
}
