import type { useAudioLibrary } from './useAudioLibrary';

const labels = {
  queued: 'Queued',
  preparing: 'Preparing',
  downloading: 'Downloading',
  converting: 'Converting to MP3',
  tagging: 'Writing Discogs tags',
  complete: 'Saved',
  failed: 'Could not download',
  cancelled: 'Cancelled',
  cancelling: 'Cancelling…',
};
function bytes(value: number) {
  return value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(1)} MB`
    : `${(value / 1000).toFixed(1)} KB`;
}
export function DownloadQueue({
  audio,
  releaseId,
}: {
  audio: ReturnType<typeof useAudioLibrary>;
  releaseId?: number;
}) {
  const jobs = audio.queue.jobs
    .filter((job) => releaseId === undefined || job.releaseId === releaseId)
    .slice(-20);
  if (!jobs.length && !audio.queue.error) return null;
  return (
    <section className="download-queue" aria-label="Download queue">
      <h3>Download queue</h3>
      {audio.queue.error && <p role="alert">{audio.queue.error}</p>}
      <ul>
        {jobs.map((job) => {
          const active = !['complete', 'failed', 'cancelled'].includes(job.stage);
          return (
            <li key={job.id}>
              <div className="queue-copy">
                <strong>{job.title}</strong>
                <span>
                  {labels[job.stage]}
                  {job.percent !== null ? ` · ${Math.floor(job.percent).toString()}%` : ''}
                </span>
                {job.bytes !== null && (
                  <small>
                    {bytes(job.bytes)}
                    {job.totalBytes !== null ? ` / ${bytes(job.totalBytes)}` : ''}
                    {job.speed !== null ? ` · ${bytes(job.speed)}/s` : ''}
                    {job.eta !== null ? ` · ${Math.ceil(job.eta).toString()}s remaining` : ''}
                  </small>
                )}
                {active && (
                  <progress
                    aria-label={`Progress for ${job.title}`}
                    value={job.percent ?? undefined}
                    max={100}
                  />
                )}
                {job.error && <p>{job.error.message}</p>}
              </div>
              {active ? (
                <button
                  type="button"
                  className="secondary-button"
                  aria-label={`Cancel download ${job.title}`}
                  disabled={job.stage === 'cancelling'}
                  onClick={() => {
                    audio.queue.cancel(job.id).catch(() => undefined);
                  }}
                >
                  Cancel
                </button>
              ) : null}
              {['failed', 'cancelled'].includes(job.stage) && (
                <button
                  type="button"
                  className="secondary-button"
                  aria-label={`Retry download ${job.title}`}
                  onClick={() => {
                    audio.queue.retry(job.id).catch(() => undefined);
                  }}
                >
                  Retry
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
