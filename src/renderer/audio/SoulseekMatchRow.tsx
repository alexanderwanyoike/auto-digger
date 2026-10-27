import { useState } from 'react';
import { Download } from 'lucide-react';
import type { DiscogsRelease } from '../../shared/discogs';
import type { SoulseekMatch } from '../../shared/soulseek';
import { matchTrack } from '../../shared/match-track';

export function SoulseekMatchRow({
  match,
  release,
  trackIndex,
  disabled,
  onDownload,
}: {
  match: SoulseekMatch;
  release: DiscogsRelease;
  trackIndex: number | null;
  disabled: boolean;
  onDownload: (match: SoulseekMatch, assignment: number | null) => void;
}) {
  const filename = match.filename.split(/[\\/]/).at(-1) ?? match.filename;
  const [assignment, setAssignment] = useState(trackIndex ?? matchTrack(release, filename));
  const format = match.filename.split('.').at(-1)?.toUpperCase() ?? 'Audio';
  const duration =
    match.length === null
      ? 'n/a'
      : `${Math.floor(match.length / 60).toString()}:${(match.length % 60).toString().padStart(2, '0')}`;
  return (
    <tr>
      <td title={match.filename}>{filename}</td>
      {trackIndex === null && (
        <td className="source-assignment">
          <select
            aria-label={`Discogs track for ${filename} from ${match.username}`}
            value={assignment ?? ''}
            disabled={disabled}
            onChange={(event) => {
              setAssignment(event.target.value === '' ? null : Number(event.target.value));
            }}
          >
            <option value="">Unassigned · keep filename</option>
            {release.tracks.map((track, index) => (
              <option key={`${track.position}-${track.title}`} value={index}>
                {track.position} · {track.title}
              </option>
            ))}
          </select>
        </td>
      )}
      <td>
        {format}
        {match.bitRate ? ` · ${match.bitRate.toString()}k` : ''}
      </td>
      <td>{duration}</td>
      <td title={match.username}>{match.username}</td>
      <td>
        <button
          type="button"
          className="icon-button"
          aria-label={`Download ${filename} from ${match.username}`}
          title={`Download from ${match.username}`}
          disabled={disabled}
          onClick={() => {
            onDownload(match, assignment);
          }}
        >
          <Download size={13} aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}
