import { useState } from 'react';
import { Headphones } from 'lucide-react';
import type { DiscogsRelease } from '../../shared/discogs';
import type { useAudioLibrary } from './use-audio-library';
import { YouTubeSources } from './YouTubeSources';
import { SoulseekSources } from './SoulseekSources';

export function DownloadSources({
  release,
  audio,
}: {
  release: DiscogsRelease;
  audio: ReturnType<typeof useAudioLibrary>;
}) {
  const [provider, setProvider] = useState<'youtube' | 'soulseek'>('youtube');
  return (
    <section className="download-sources" aria-label="Audio sources">
      <div className="sources-title">
        <h3>
          <Headphones size={14} aria-hidden="true" />
          Audio sources
        </h3>
      </div>
      <p className="sources-description">Choose where to find the audio for this record.</p>
      <div className="source-provider-choice" role="group" aria-label="Download from">
        <button
          type="button"
          aria-pressed={provider === 'youtube'}
          onClick={() => {
            setProvider('youtube');
          }}
        >
          YouTube
        </button>
        <button
          type="button"
          aria-pressed={provider === 'soulseek'}
          onClick={() => {
            setProvider('soulseek');
          }}
        >
          Soulseek
        </button>
      </div>
      {audio.queue.error && (
        <p role="alert" className="source-notice">
          {audio.queue.error}
        </p>
      )}
      <div hidden={provider !== 'youtube'}>
        <YouTubeSources release={release} audio={audio} />
      </div>
      {provider === 'soulseek' && <SoulseekSources release={release} audio={audio} />}
    </section>
  );
}
