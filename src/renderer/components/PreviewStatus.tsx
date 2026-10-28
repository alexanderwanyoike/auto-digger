import { X } from 'lucide-react';
import type { useAudioLibrary } from '../audio/use-audio-library';

export function PreviewStatus({ audio }: { audio: ReturnType<typeof useAudioLibrary> }) {
  const pending = audio.preparingPreview;
  if (!pending) return null;
  return (
    <div className="preview-status">
      <span role="status">
        Preparing {'provider' in pending ? 'Soulseek' : 'YouTube'} preview · {pending.release.title}
      </span>
      <button
        type="button"
        className="preview-status-cancel"
        aria-label="Cancel preparing preview"
        onClick={() => {
          audio.cancelPreview(pending).catch(() => undefined);
        }}
      >
        <X size={11} aria-hidden="true" /> Cancel
      </button>
    </div>
  );
}
