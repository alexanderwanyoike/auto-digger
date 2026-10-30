import { useState } from 'react';
import { ReleaseDownload } from './ReleaseDownload';
import { sourceAssignment } from './source-assignment';
import type { DiscogsRelease } from '../../shared/discogs';
import { videoId } from '../../shared/youtube-video-id';
import type { useAudioLibrary } from './use-audio-library';
import { useSources } from './use-sources';
import { SourceRow } from './SourceRow';
import { SourceGroup } from './SourceGroup';
import { uniqueVideoIndexes } from './unique-video-indexes';

export function YouTubeSources({
  release,
  audio,
}: {
  release: DiscogsRelease;
  audio: ReturnType<typeof useAudioLibrary>;
}) {
  const [manual, setManual] = useState<Record<number, number | null>>({});
  const { results, retry } = useSources(release, audio.bridge);
  const indexes = uniqueVideoIndexes(release.videos);
  const saved = release.videos.map((video) =>
    audio.tracks.find(
      (track) => track.releaseId === release.id && track.videoId === videoId(video.url),
    ),
  );
  const assignments = release.videos.map((_video, index) =>
    indexes.includes(index) && (results[index]?.ok || (saved[index] && !saved[index].missing))
      ? sourceAssignment(release, index, results[index], saved[index], manual[index]).selected
      : null,
  );
  const selections = release.videos.map(
    (_video, index) =>
      sourceAssignment(release, index, results[index], saved[index], manual[index]).selected,
  );
  const renderSource = (index: number) => (
    <SourceRow
      key={`${release.id.toString()}-${index.toString()}`}
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
  );
  return (
    <>
      {release.videos.length > 0 && (
        <ReleaseDownload
          release={release}
          assignments={assignments}
          checking={indexes.some((index) => !results[index])}
          audio={audio}
        />
      )}
      {release.videos.length ? (
        <ol className="source-list" aria-label="YouTube audio sources">
          {release.tracks.map((track, trackIndex) => (
            <SourceGroup
              key={`${track.position}-${track.title}`}
              indexes={indexes.filter((index) => selections[index] === trackIndex)}
              renderSource={renderSource}
            />
          ))}
          <SourceGroup
            unmatched
            indexes={indexes.filter((index) => selections[index] === null)}
            renderSource={renderSource}
          />
        </ol>
      ) : (
        <p className="source-notice">
          No YouTube videos are attached to this release on Discogs. Choose Soulseek to find a
          track.
        </p>
      )}
    </>
  );
}
