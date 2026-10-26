import { Library, Bookmark, X } from 'lucide-react';
import { CratePicker } from '../crate/CratePicker';
import { RecordArtwork } from './RecordArtwork';
import type { DiscogsRelease } from '../../shared/discogs';
import type { useCrate } from '../crate/use-crate';

export function CratePanel({
  crate,
  onOpen,
  disabled,
}: {
  crate: ReturnType<typeof useCrate>;
  onOpen: (release: DiscogsRelease) => void;
  disabled: boolean;
}) {
  return (
    <aside className="crate-panel" aria-labelledby="crate-heading">
      <div className="panel-heading">
        <h2 id="crate-heading">
          <Library size={15} aria-hidden="true" /> Your crate
        </h2>
        <span
          className="count-badge"
          aria-label={`${crate.releases.length.toString()} saved releases`}
        >
          {crate.releases.length}
        </span>
      </div>
      <div className="desk-panel-scroll">
        <CratePicker crate={crate} />
        <p className="panel-description">The ones worth coming back to.</p>
        {crate.busy && (
          <p className="crate-notice" role="status">
            Updating crate…
          </p>
        )}
        {crate.error && (
          <div className="crate-notice">
            <p role="alert">{crate.error.message}</p>
            <button
              type="button"
              className="secondary-button"
              disabled={crate.busy}
              onClick={() => {
                crate.reload().catch(() => undefined);
              }}
            >
              Retry crate
            </button>
          </div>
        )}
        {!crate.releases.length && !crate.error && (
          <div className="crate-empty">
            <div className="empty-sleeves" aria-hidden="true">
              <span />
              <span />
              <span>
                <Bookmark size={20} strokeWidth={1} />
              </span>
            </div>
            <h3>No records saved yet.</h3>
            <p>
              When something catches your ear,
              <br />
              keep the whole release here.
            </p>
          </div>
        )}
        {Boolean(crate.releases.length) && (
          <ol className="crate-list">
            {crate.releases.map((release) => (
              <li key={release.id}>
                <button
                  className="crate-open"
                  type="button"
                  aria-label={`Open ${release.title}`}
                  disabled={disabled}
                  onClick={() => {
                    onOpen(release);
                  }}
                >
                  <RecordArtwork url={release.artworkUrl} title={release.title} decorative />
                  <span className="crate-copy">
                    <strong>{release.title}</strong>
                    <span>
                      {release.artists.join(', ') || 'Artist not listed'} ·{' '}
                      {release.year ?? 'Year not listed'}
                    </span>
                  </span>
                </button>
                <button
                  className="crate-remove"
                  type="button"
                  aria-label={`Remove ${release.title}`}
                  disabled={crate.busy}
                  onClick={() => {
                    crate.remove(release.id).catch(() => undefined);
                  }}
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
      <div className="crate-footer">
        <span className="eyebrow">SAVE NOW. LISTEN LATER.</span>
        <p>
          {crate.available
            ? 'Records, saved on this device.'
            : 'Use the desktop app to save your crate.'}
        </p>
      </div>
    </aside>
  );
}
