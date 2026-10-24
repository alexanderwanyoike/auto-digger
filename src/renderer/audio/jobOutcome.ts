import type { AudioResult, LocalTrack } from '../../shared/audio';
import type { DownloadJob } from '../../shared/downloadJobs';
import { audioFailure } from '../../shared/audioFailure';

export function jobOutcome(job: DownloadJob): AudioResult<LocalTrack> | null {
  if (job.stage === 'complete' && job.track) return { ok: true, value: job.track };
  if (job.stage === 'cancelled')
    return audioFailure(
      'cancelled',
      'This download was cancelled. Completed tracks have been kept.',
    );
  if (job.stage === 'failed')
    return {
      ok: false,
      error: job.error ?? {
        code: 'unavailable',
        message: 'This download could not finish. Please retry.',
      },
    };
  return null;
}
