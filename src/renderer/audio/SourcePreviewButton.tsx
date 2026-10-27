import { useEffect } from 'react';
import { Play, X } from 'lucide-react';
import type { DownloadInput } from '../../shared/audio';
import { downloadSourceId } from '../../shared/download-source-id';
import type { useAudioLibrary } from './use-audio-library';

export function SourcePreviewButton({
  input,
  audio,
  disabled,
  label = 'Preview audio',
  onError,
  onPendingChange,
}: {
  input: DownloadInput;
  audio: ReturnType<typeof useAudioLibrary>;
  disabled: boolean;
  label?: string;
  onError: (message: string | null) => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const pending = Boolean(
    audio.preparingPreview && downloadSourceId(audio.preparingPreview) === downloadSourceId(input),
  );
  useEffect(() => {
    onPendingChange?.(pending);
  }, [onPendingChange, pending]);
  return (
    <button
      type="button"
      className="secondary-button source-preview"
      aria-label={pending ? label.replace(/^Preview/, 'Cancel preview') : label}
      title={
        pending
          ? 'Preparing temporary audio. Cancel preview.'
          : 'Preview without saving to Downloads'
      }
      aria-busy={pending}
      disabled={disabled || !window.audioPreviews}
      onClick={() => {
        onError(null);
        if (pending) {
          audio
            .cancelPreview(input)
            .then((result) => {
              if (!result.ok) onError(result.error.message);
            })
            .catch(() => {
              onError('The preview could not be cancelled. Please retry.');
            });
          return;
        }
        audio
          .preview(input)
          .then((result) => {
            if (!result.ok && result.error.code !== 'cancelled') onError(result.error.message);
          })
          .catch(() => {
            onError('The preview could not start. Please retry.');
          });
      }}
    >
      {pending ? <X size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
    </button>
  );
}
