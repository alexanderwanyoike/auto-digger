import { useState } from 'react';
import { Download, LoaderCircle } from 'lucide-react';
import type { DiscogsRelease } from '../../shared/discogs';
import type { SoulseekMatch } from '../../shared/soulseek';
import { matchTrack } from '../../shared/match-track';

export function SoulseekMatchRow({
  match,
  release,
  trackIndex,
  disabled,
  saved,
  onDownload,
}: {
  match: SoulseekMatch;
  release: DiscogsRelease;
  trackIndex: number | null;
  disabled: boolean;
  saved: boolean;
  onDownload: (match: SoulseekMatch, assignment: number | null) => Promise<void>;
}) {
  const filename = match.filename.split(/[\\/]/).at(-1) ?? match.filename;
  const [assignment, setAssignment] = useState(trackIndex ?? matchTrack(release, filename));
  const [pending, setPending] = useState(false);
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
            disabled={disabled || saved || pending}
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
        {saved ? (
          <span title="Saved from Soulseek">Saved</span>
        ) : (
          <button
            type="button"
            className="icon-button"
            aria-label={`Download ${filename} from ${match.username}`}
            title={`Download from ${match.username}`}
            disabled={disabled || pending}
            aria-busy={pending}
            onClick={() => {
              setPending(true);
              onDownload(match, assignment)
                .finally(() => {
                  setPending(false);
                })
                .catch(() => undefined);
            }}
          >
            {pending ? (
              <LoaderCircle size={13} className="source-spinner" aria-hidden="true" />
            ) : (
              <Download size={13} aria-hidden="true" />
            )}
          </button>
        )}
      </td>
    </tr>
  );
}
