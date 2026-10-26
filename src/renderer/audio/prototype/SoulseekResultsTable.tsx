import { Check, Download } from 'lucide-react';
import type { DemoCandidate } from './demoData';

export function SoulseekResultsTable({
  candidates,
  saved,
  busy,
  download,
}: {
  candidates: DemoCandidate[];
  saved: boolean;
  busy: boolean;
  download: (candidate: DemoCandidate) => void;
}) {
  return (
    <>
      <div className="desk-soulseek-count">
        <span>{candidates.length.toString()} matches</span>
        {candidates.length > 6 && <span>Scroll for more</span>}
      </div>
      <div
        className="desk-soulseek-table-scroll"
        role="region"
        aria-label="Scrollable Soulseek matches"
      >
        <table className="desk-soulseek-table" aria-label="Soulseek search results">
          <colgroup>
            <col />
            <col className="desk-match-quality" />
            <col className="desk-match-time" />
            <col className="desk-match-peer" />
            <col className="desk-match-action" />
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
            {candidates.map((candidate) => (
              <tr key={candidate.id}>
                <td title={candidate.filename}>{candidate.filename}</td>
                <td title={candidate.quality}>{candidate.quality}</td>
                <td>{candidate.duration}</td>
                <td title={candidate.owner}>{candidate.owner}</td>
                <td>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Download from ${candidate.owner}`}
                    title={saved ? 'Track saved' : `Download from ${candidate.owner}`}
                    disabled={saved || busy}
                    onClick={() => {
                      download(candidate);
                    }}
                  >
                    {saved ? (
                      <Check size={13} aria-hidden="true" />
                    ) : (
                      <Download size={13} aria-hidden="true" />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
