import type { DiscogsRelease } from '../../shared/discogs';
import type { SoulseekMatch } from '../../shared/soulseek';
import { SoulseekMatchRow } from './SoulseekMatchRow';

export function SoulseekTable({
  matches,
  disabled,
  onDownload,
  release,
  trackIndex,
  savedIds,
}: {
  matches: SoulseekMatch[];
  disabled: boolean;
  onDownload: (match: SoulseekMatch, assignment: number | null) => void;
  release: DiscogsRelease;
  trackIndex: number | null;
  savedIds: string[];
}) {
  return (
    <div className="soulseek-table-scroll" role="region" aria-label="Scrollable Soulseek matches">
      <table
        className={`soulseek-table${trackIndex === null ? ' soulseek-release-table' : ''}`}
        aria-label="Soulseek search results"
      >
        <colgroup>
          <col />
          {trackIndex === null && <col className="soulseek-assignment" />}
          <col className="soulseek-quality" />
          <col className="soulseek-time" />
          <col className="soulseek-peer" />
          <col className="soulseek-action" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">File</th>
            {trackIndex === null && <th scope="col">Discogs track</th>}
            <th scope="col">Quality</th>
            <th scope="col">Time</th>
            <th scope="col">Peer</th>
            <th scope="col">
              <span className="sr-only">Download</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match) => (
            <SoulseekMatchRow
              key={match.id}
              match={match}
              release={release}
              trackIndex={trackIndex}
              disabled={disabled}
              saved={savedIds.includes(`${release.id.toString()}-slsk-${match.id}`)}
              onDownload={onDownload}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
