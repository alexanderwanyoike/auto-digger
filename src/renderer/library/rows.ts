import type { LocalTrack } from '../../shared/audio';
import type { DownloadJob } from '../../shared/downloadJobs';

export interface LibraryRow {
  id: string;
  track: LocalTrack | null;
  job: DownloadJob | null;
}
export function pendingDownload(job: DownloadJob): boolean {
  return !['complete', 'failed', 'cancelled'].includes(job.stage);
}
export function libraryRows(
  tracks: LocalTrack[],
  jobs: DownloadJob[],
  query: string,
): LibraryRow[] {
  const rows = new Map<string, LibraryRow>(
    tracks.map((track) => [track.id, { id: track.id, track, job: null }]),
  );
  jobs.forEach((job) => {
    const id = job.sourceId ?? job.track?.id ?? `job-${job.id}`;
    const row = rows.get(id) ?? { id, track: null, job: null };
    if (job.stage === 'complete') {
      if (!row.track && job.track) row.track = job.track;
      if (row.job && !pendingDownload(row.job)) row.job = null;
    } else if (!row.job || !pendingDownload(row.job) || pendingDownload(job)) row.job = job;
    rows.set(id, row);
  });
  const search = query.trim().toLowerCase();
  return [...rows.values()]
    .filter(({ track, job }) =>
      `${track?.title ?? ''} ${track?.artist ?? ''} ${track?.album ?? ''} ${job?.title ?? ''} ${job?.artist ?? ''} ${job?.album ?? ''}`
        .toLowerCase()
        .includes(search),
    )
    .sort(
      (left, right) =>
        Number(Boolean(right.job)) - Number(Boolean(left.job)) ||
        (left.track?.title ?? left.job?.title ?? '').localeCompare(
          right.track?.title ?? right.job?.title ?? '',
        ),
    );
}
