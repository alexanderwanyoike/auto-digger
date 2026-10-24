import { useState } from 'react';
import { Headphones } from 'lucide-react';
import { DownloadQueue } from './DownloadQueue';
import { ReleaseDownload } from './ReleaseDownload';
import { sourceAssignment } from './sourceAssignment';
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
  const [manual, setManual] = useState<Record<number, number | null>>({});
  const { results, retry } = useSources(release, audio.bridge);
  const saved = release.videos.map((video) =>
    audio.tracks.find(
      (track) => track.releaseId === release.id && track.videoId === videoId(video.url),
    ),
  );
  const assignments = release.videos.map((_video, index) =>
    results[index]?.ok || (saved[index] && !saved[index].missing)
      ? sourceAssignment(release, index, results[index], saved[index], manual[index]).selected
      : null,
  );
  return (
    <section className="download-sources" aria-label="Audio sources">
      <div className="sources-title">
        <h3>
          <Headphones size={14} aria-hidden="true" />
          Audio sources
        </h3>
        <span>
          {release.videos.length} {release.videos.length === 1 ? 'video' : 'videos'}
        </span>
      </div>
      <p className="sources-description">
        Discogs names the track. YouTube supplies the audio. Change any match before downloading.
      </p>
      {release.videos.length > 0 && (
        <ReleaseDownload
          release={release}
          assignments={assignments}
          checking={release.videos.some((_video, index) => !results[index])}
          audio={audio}
        />
      )}
      <DownloadQueue audio={audio} releaseId={release.id} />
      {release.videos.length ? (
        <ol className="source-list" aria-label="YouTube audio sources">
          {release.videos.map((video, index) => (
            <SourceRow
              key={`${release.id.toString()}-${index.toString()}-${video.url}`}
              release={release}
              index={index}
              audio={audio}
              checked={results[index]}
              saved={saved[index]}
              manual={manual[index]}
              onAssign={(trackIndex) => {
                setManual((previous) => ({ ...previous, [index]: trackIndex }));
              }}
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
