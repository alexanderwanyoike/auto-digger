import type {
  ApiProbeInput,
  ApiProbeReport,
  ApiPrototypeError,
  ApiProbeItem,
} from '../../shared/api-feasibility-prototype';

export function ApiProbeResults({
  report,
  error,
  busy,
  onSimilar,
  onOpen,
}: {
  report: ApiProbeReport | null;
  error: ApiPrototypeError | null;
  busy: boolean;
  onSimilar: (query: string) => void;
  onOpen: (item: ApiProbeItem) => void;
}) {
  const evidence = report ?? error;
  return (
    <div className="api-probe-results" aria-live="polite">
      {error && <p role="alert">{error.message}</p>}
      {evidence?.endpoint && (
        <div className="api-probe-evidence">
          <strong>
            {evidence.httpStatus ? `HTTP ${evidence.httpStatus.toString()}` : 'No response'}
          </strong>
          <code>{evidence.endpoint}</code>
        </div>
      )}
      {report && (
        <>
          <p>{report.note}</p>
          <div className="api-probe-table">
            <table>
              <caption>{report.items.length.toString()} results from the live API</caption>
              <thead>
                <tr>
                  <th>Artist</th>
                  <th>Track / release</th>
                  <th>ID</th>
                  <th>Next</th>
                </tr>
              </thead>
              <tbody>
                {report.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.artist}</td>
                    <td>{item.title}</td>
                    <td>
                      <code>{item.id}</code>
                    </td>
                    <td>
                      {report.provider === 'cosine' && (
                        <div className="api-probe-actions">
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={busy}
                            aria-label={`Similar tracks for ${item.title}`}
                            onClick={() => {
                              onSimilar(item.id);
                            }}
                          >
                            Similar tracks
                          </button>
                          {item.sourceUrl && (
                            <button
                              type="button"
                              className="secondary-button"
                              disabled={busy}
                              aria-label={`Open release for ${item.title}`}
                              onClick={() => {
                                onOpen(item);
                              }}
                            >
                              Open release
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details>
            <summary>Response fields and source links</summary>
            <p>Fields: {report.fields.join(', ') || 'Empty result set'}</p>
            <pre>{JSON.stringify(report.items, null, 2)}</pre>
          </details>
        </>
      )}
    </div>
  );
}

export const cosineOperations: { value: ApiProbeInput['operation']; label: string }[] = [
  { value: 'lookup', label: 'Look up a track URL' },
  { value: 'search', label: 'Search artist and title' },
  { value: 'similar', label: 'Similar tracks by Cosine ID' },
];
