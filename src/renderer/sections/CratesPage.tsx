import { useState } from 'react';
import type { DiscogsRelease } from '../../shared/discogs';
import type { useCrate } from '../crate/useCrate';
import { CratePicker } from '../crate/CratePicker';
import { TrackMarks } from '../crate/TrackMarks';
import { RecordArtwork } from '../components/RecordArtwork';

export function CratesPage({
  crate,
  onOpen,
}: {
  crate: ReturnType<typeof useCrate>;
  onOpen: (release: DiscogsRelease) => void;
}) {
  const [name, setName] = useState('');
  const [rename, setRename] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { catalogue } = crate;
  const active = catalogue.view.crates.find((item) => item.id === catalogue.view.crateId);
  return (
    <section className="section-page crates-page" aria-label="Crate manager">
      <div className="section-intro">
        <span className="eyebrow">SAVE NOW. LISTEN LATER.</span>
        <p>Records, picks and notes for the next session.</p>
      </div>
      <div className="crate-management">
        <CratePicker crate={crate} />
        <form
          onSubmit={(event) => {
            event.preventDefault();
            catalogue
              .perform((api) => api.create(name))
              .then((result) => {
                if (result.ok) setName('');
              })
              .catch(() => undefined);
          }}
        >
          <label htmlFor="new-crate-name">
            New crate name
            <input
              id="new-crate-name"
              value={name}
              maxLength={80}
              required
              onChange={(event) => {
                setName(event.target.value);
              }}
            />
          </label>
          <button
            className="primary-button"
            type="submit"
            disabled={crate.busy || !catalogue.available}
          >
            Create crate
          </button>
        </form>
      </div>
      {active && (
        <details className="crate-options" key={active.id}>
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
            Retry crates
          </button>
        </div>
      )}
      {!catalogue.view.entries.length && (
        <p className="section-empty">
          {active
            ? 'This crate is ready for records. Save a release from the digging desk.'
            : 'Create a crate to start keeping records.'}
        </p>
      )}
      <div className="crate-entries">
        {catalogue.view.entries.map((entry) => (
          <article
            className="crate-entry"
            key={`${active?.id ?? ''}-${entry.release.id.toString()}`}
          >
            <header>
              <RecordArtwork
                url={entry.release.artworkUrl}
                title={entry.release.title}
                decorative
              />
              <div>
                <span className="eyebrow">{entry.release.artists.join(', ')}</span>
                <button
                  className="record-title-button"
                  type="button"
                  aria-label={`Open ${entry.release.title}`}
                  onClick={() => {
                    onOpen(entry.release);
                  }}
                >
                  {entry.release.title}
                </button>
                <span>
                  {entry.release.year} · {entry.release.formats.join(' / ')}
                </span>
              </div>
              <button
                type="button"
                className="secondary-button"
                disabled={crate.busy}
                onClick={() => {
                  crate.remove(entry.release.id).catch(() => undefined);
                }}
              >
                Remove release
              </button>
            </header>
            <ol className="track-marks">
              {entry.tracks.map((track) => (
                <TrackMarks
                  key={track.key}
                  track={track}
                  releaseId={entry.release.id}
                  crate={crate}
                />
              ))}
            </ol>
          </article>
        ))}
      </div>
    </section>
  );
}
