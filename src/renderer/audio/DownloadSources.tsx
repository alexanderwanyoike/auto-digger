import { Headphones } from 'lucide-react';
import type { DiscogsRelease } from '../../shared/discogs';
import { videoId } from '../../shared/youtubeVideoId';
import type { useAudioLibrary } from './useAudioLibrary';
import { useSources } from './useSources';
import { SourceRow } from './SourceRow';

export function DownloadSources({
  release,
  audio,
}: {
  release: DiscogsRelease;
  audio: ReturnType<typeof useAudioLibrary>;
}) {
  const { results, retry } = useSources(release, audio.bridge);
  return (
    <section className="download-sources" aria-label="Audio sources">
      <div className="sources-title">
        <h3>
          <Headphones size={14} aria-hidden="true" />
          Audio sources
        </h3>
        <span>MP3 / DISCOGS TAGS</span>
      </div>
      <p className="sources-description">Download a source, then listen from the player below.</p>
      {release.videos.length ? (
        <ol className="source-list">
          {release.videos.map((video, index) => (
            <SourceRow
              key={`${release.id.toString()}-${index.toString()}-${video.url}`}
              release={release}
              index={index}
              audio={audio}
              checked={results[index]}
              saved={audio.tracks.find(
                (track) => track.releaseId === release.id && track.videoId === videoId(video.url),
              )}
              retry={() => retry(index)}
            />
          ))}
        </ol>
      ) : (
        <p className="source-notice">
          No YouTube sources are attached to this release on Discogs. Try another record.
        </p>
      )}
    </section>
  );
}
