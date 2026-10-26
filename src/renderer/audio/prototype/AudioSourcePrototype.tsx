import { TrackLedger } from './TrackLedger';
import { SourceInspector } from './SourceInspector';
import { ReleaseShelves } from './ReleaseShelves';
import { PrototypeSwitcher, usePrototypeLayout } from './PrototypeSwitcher';
import { useAudioPrototype } from './useAudioPrototype';
import './prototype.css';

export function AudioSourcePrototype() {
  const state = useAudioPrototype();
  const { variant, cycle } = usePrototypeLayout();
  return (
    <section className="section-page audio-prototype" aria-label="Audio sources prototype">
      <header className="prototype-heading">
        <div>
          <span className="eyebrow">AUDIO SOURCE STUDY · THROWAWAY</span>
          <h2>Audio sources prototype</h2>
          <p>Demo data. No searches, downloads or files leave this page.</p>
        </div>
        <label htmlFor="prototype-scenario">
          Search scenario
          <select
            id="prototype-scenario"
            value={state.scenario}
            onChange={(event) => {
              state.setScenario(event.target.value);
            }}
          >
            <option value="normal">Public and private matches</option>
            <option value="private-only">Private matches only</option>
            <option value="offline">slskd disconnected</option>
            <option value="empty">No matches</option>
          </select>
        </label>
      </header>
      {variant === 'A' && <TrackLedger state={state} />}
      {variant === 'B' && <SourceInspector state={state} />}
      {variant === 'C' && <ReleaseShelves state={state} />}
      <details className="prototype-state">
        <summary>Inspect prototype state</summary>
        <pre>
          {JSON.stringify(
            {
              variant,
              selectedTrack: state.track.id,
              rawQuery: state.query,
              soulseekQuery: state.cleaned,
              checked: state.checked,
              scenario: state.scenario,
              showPrivate: state.showPrivate,
              libraryFolder: state.folder,
              folderLayout: state.layout,
              separateBySource: state.separate,
              savedCopies: state.library.copies,
              preferredCopies: state.library.preferred,
              transfer: state.library.job,
            },
            null,
            2,
          )}
        </pre>
      </details>
      <PrototypeSwitcher variant={variant} cycle={cycle} />
    </section>
  );
}
