import type { DownloadJob } from '../../shared/download-jobs';
import { downloadLabels } from '../audio/download-labels';
import { pendingDownload } from './rows';

export function DownloadState({ job }: { job: DownloadJob }) {
  return (
    <div className={`library-download-state state-${job.stage}`}>
      <span>
        {downloadLabels[job.stage]}
        {job.percent === null ? '' : ` · ${Math.floor(job.percent).toString()}%`}
      </span>
      {pendingDownload(job) && (
        <progress
          aria-label={`Progress for ${job.title}`}
          max={100}
          value={job.percent ?? undefined}
        />
      )}
    </div>
  );
}
