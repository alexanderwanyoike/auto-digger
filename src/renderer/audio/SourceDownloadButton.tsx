import { Download, LoaderCircle, Tags } from 'lucide-react';
import type { DownloadJob } from '../../shared/download-jobs';
import { downloadLabels } from './download-labels';

export function SourceDownloadButton({
  job,
  pending,
  checking,
  disabled,
  tagging,
  onDownload,
  onCancel,
}: {
  job: DownloadJob | undefined;
  pending: boolean;
  checking: boolean;
  disabled: boolean;
  tagging: boolean;
  onDownload: () => void;
  onCancel: (id: string) => void;
}) {
  const active = job && !['complete', 'failed', 'cancelled'].includes(job.stage) ? job : undefined;
  const busy = pending || Boolean(active);
  const checkingSource = checking && !busy;
  const percent =
    active?.percent === null || active?.percent === undefined
      ? undefined
      : Math.floor(active.percent);
  const idleLabel = tagging ? 'Update tags' : 'Download audio';
  const label = active ? `Cancel download ${active.title}` : idleLabel;
  const idleTitle = checkingSource ? 'Checking audio availability' : label;
  const stageLabel = active ? downloadLabels[active.stage] : 'Preparing';
  const Icon = tagging ? Tags : Download;
  const icon = checkingSource ? (
    <LoaderCircle
      className="source-spinner"
      size={14}
      role="progressbar"
      aria-label="Checking audio availability"
      aria-hidden={false}
    />
  ) : (
    <Icon size={14} aria-hidden="true" />
  );
  return (
    <button
      type="button"
      className="secondary-button source-download"
      aria-label={label}
      title={
        active
          ? `${downloadLabels[active.stage]} · ${percent === undefined ? 'Please wait' : `${percent.toString()}%`} · Cancel download`
          : idleTitle
      }
      aria-busy={busy || checkingSource}
      disabled={active ? active.stage === 'cancelling' : disabled || pending || checkingSource}
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
            aria-valuetext={percent === undefined ? stageLabel : undefined}
          >
            {percent === undefined ? '…' : `${percent.toString()}%`}
          </span>
        </>
      ) : (
        icon
      )}
    </button>
  );
}
