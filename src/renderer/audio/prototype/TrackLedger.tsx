import { DemoLibrary } from './DemoLibrary';
import { OrganisationPreview } from './OrganisationPreview';
import { TrackInspector } from './TrackInspector';
import type { useAudioPrototype } from './useAudioPrototype';

export function TrackLedger({ state }: { state: ReturnType<typeof useAudioPrototype> }) {
  return (
    <div className="prototype-ledger">
      <DemoLibrary
        copies={state.library.copies}
        preferred={state.library.preferred}
        onSelect={state.selectTrack}
      />
      <div className="prototype-ledger-detail">
        <TrackInspector state={state} />
        <OrganisationPreview state={state} />
      </div>
    </div>
  );
}
