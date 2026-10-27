import { useId, useState } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import type { DiscogsRelease } from '../../shared/discogs';
import type { useAudioLibrary } from './use-audio-library';
import { SoulseekPanel } from './SoulseekPanel';

export function SoulseekSourceRow({
  release,
  trackIndex,
  audio,
  expanded,
  onToggle,
}: {
  release: DiscogsRelease;
  trackIndex: number | null;
  audio: ReturnType<typeof useAudioLibrary>;
  expanded: boolean;
  onToggle: () => void;
}) {
  const id = useId();
  const track = trackIndex === null ? undefined : release.tracks[trackIndex];
  const position = track?.position || (trackIndex === null ? 'Release' : 'Track');
  const title = track?.title ?? release.title;
  const [query, setQuery] = useState(`${release.artists.join(' ')} ${title}`);
  return (
    <div className="soulseek-source">
      <button
        type="button"
        className="soulseek-source-toggle"
        aria-label={`Search ${trackIndex === null ? 'release' : position} · ${title}`}
        aria-expanded={expanded}
        aria-controls={id}
        onClick={onToggle}
      >
        <ChevronRight size={12} aria-hidden="true" />
        <span className="soulseek-source-position">{position}</span>
        <span className="soulseek-source-title" title={title}>
          {title}
        </span>
        <Search size={12} aria-hidden="true" />
      </button>
      <div id={id} hidden={!expanded}>
        {expanded && (
          <SoulseekPanel
            release={release}
            trackIndex={trackIndex}
            audio={audio}
            query={query}
            onEdit={setQuery}
          />
        )}
      </div>
    </div>
  );
}
