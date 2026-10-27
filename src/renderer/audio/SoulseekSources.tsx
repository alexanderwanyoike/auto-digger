import { useState } from 'react';
import type { DiscogsRelease } from '../../shared/discogs';
import type { useAudioLibrary } from './use-audio-library';
import { SoulseekSourceRow } from './SoulseekSourceRow';

export function SoulseekSources({
  release,
  audio,
}: {
  release: DiscogsRelease;
  audio: ReturnType<typeof useAudioLibrary>;
}) {
  const [expanded, setExpanded] = useState<number | null | undefined>();
  return (
    <div className="soulseek-sources">
      {[null, ...release.tracks.map((_track, index) => index)].map((trackIndex) => (
        <SoulseekSourceRow
          key={trackIndex ?? 'release'}
          release={release}
          trackIndex={trackIndex}
          audio={audio}
          expanded={expanded === trackIndex}
          onToggle={() => {
            setExpanded(expanded === trackIndex ? undefined : trackIndex);
          }}
        />
      ))}
    </div>
  );
}
