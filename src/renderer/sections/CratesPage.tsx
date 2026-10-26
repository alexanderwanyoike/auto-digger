import { useState } from 'react';
import type { DiscogsRelease } from '../../shared/discogs';
import type { useCrate } from '../crate/use-crate';
import { CrateOptions } from '../crate/CrateOptions';
import { CratePicker } from '../crate/CratePicker';
import { ResearchNotes } from '../crate/ResearchNotes';
import { TrackMarks } from '../crate/TrackMarks';
import { RecordArtwork } from '../components/RecordArtwork';

export function CratesPage({
  crate,
  onOpen,
  disabled,
}: {
  crate: ReturnType<typeof useCrate>;
  onOpen: (release: DiscogsRelease) => void;
  disabled: boolean;
}) {
  const [name, setName] = useState('');
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
      {active && <CrateOptions key={active.id} active={active} crate={crate} />}
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
                  disabled={disabled}
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
      <ResearchNotes notes={catalogue.view.research ?? []} />
    </section>
  );
}
