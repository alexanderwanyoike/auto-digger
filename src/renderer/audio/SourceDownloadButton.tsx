import { Download, LoaderCircle, Tags } from 'lucide-react';
import type { DownloadJob } from '../../shared/downloadJobs';
import { downloadLabels } from './downloadLabels';

export function SourceDownloadButton({
  job,
  pending,
  disabled,
  tagging,
  onDownload,
  onCancel,
}: {
  job: DownloadJob | undefined;
  pending: boolean;
  disabled: boolean;
  tagging: boolean;
  onDownload: () => void;
  onCancel: (id: string) => void;
}) {
  const active = job && !['complete', 'failed', 'cancelled'].includes(job.stage) ? job : undefined;
  const busy = pending || Boolean(active);
  const percent =
    active?.percent === null || active?.percent === undefined
      ? undefined
      : Math.floor(active.percent);
  const label = active
    ? `Cancel download ${active.title}`
    : tagging
      ? 'Update tags'
      : 'Download audio';
  const Icon = tagging ? Tags : Download;
  return (
    <button
      type="button"
      className="secondary-button source-download"
      aria-label={label}
      title={
        active
          ? `${downloadLabels[active.stage]} · ${percent === undefined ? 'Please wait' : `${percent.toString()}%`} · Cancel download`
          : label
      }
      aria-busy={busy}
      disabled={active ? active.stage === 'cancelling' : disabled || pending}
      onClick={() => {
        if (active) onCancel(active.id);
        else onDownload();
      }}
    >
      {busy ? (
        <>
          <LoaderCircle className="source-spinner" size={13} aria-hidden="true" />
          <span
            role="progressbar"
            aria-label={`Progress for ${active?.title ?? 'audio'}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-valuetext={
              percent === undefined
                ? active
                  ? downloadLabels[active.stage]
                  : 'Preparing'
                : undefined
            }
          >
            {percent === undefined ? '…' : `${percent.toString()}%`}
          </span>
        </>
      ) : (
        <Icon size={14} aria-hidden="true" />
      )}
    </button>
  );
}
