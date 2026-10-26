import { Download } from 'lucide-react';
import type { SoulseekMatch } from '../../shared/soulseek';

export function SoulseekTable({
  matches,
  disabled,
  onDownload,
}: {
  matches: SoulseekMatch[];
  disabled: boolean;
  onDownload: (match: SoulseekMatch) => void;
}) {
  return (
    <div className="soulseek-table-scroll" role="region" aria-label="Scrollable Soulseek matches">
      <table className="soulseek-table" aria-label="Soulseek search results">
        <colgroup>
          <col />
          <col className="soulseek-quality" />
          <col className="soulseek-time" />
          <col className="soulseek-peer" />
          <col className="soulseek-action" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">File</th>
            <th scope="col">Quality</th>
            <th scope="col">Time</th>
            <th scope="col">Peer</th>
            <th scope="col">
              <span className="sr-only">Download</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match) => {
            const filename = match.filename.split(/[\\/]/).at(-1) ?? match.filename;
            const format = match.filename.split('.').at(-1)?.toUpperCase() ?? 'Audio';
            const duration =
              match.length === null
                ? 'n/a'
                : `${Math.floor(match.length / 60).toString()}:${(match.length % 60).toString().padStart(2, '0')}`;
            return (
              <tr key={match.id}>
                <td title={match.filename}>{filename}</td>
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
                      onDownload(match);
                    }}
                  >
                    <Download size={13} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
