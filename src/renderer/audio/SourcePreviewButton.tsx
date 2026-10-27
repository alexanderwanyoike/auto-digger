import { useState } from 'react';
import { Play, X } from 'lucide-react';
import type { DownloadInput } from '../../shared/audio';
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
  const [pending, setPending] = useState(false);
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
            .catch(() => onError('The preview could not be cancelled. Please retry.'));
          return;
        }
        setPending(true);
        onPendingChange?.(true);
        audio
          .preview(input)
          .then((result) => {
            if (!result.ok && result.error.code !== 'cancelled') onError(result.error.message);
          })
          .catch(() => onError('The preview could not start. Please retry.'))
          .finally(() => {
            setPending(false);
            onPendingChange?.(false);
          });
      }}
    >
      {pending ? <X size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
    </button>
  );
}
