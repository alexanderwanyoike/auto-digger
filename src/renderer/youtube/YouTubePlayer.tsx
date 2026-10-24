import { useState } from 'react';
import { videoId } from './videoId';
import { useYouTube } from './useYouTube';

function Video({ id }: { id: string }) {
  const [retry, setRetry] = useState(0);
  const { host, message, error } = useYouTube(id, retry);
  return (
    <>
      <div className="youtube-frame" ref={host} aria-label="YouTube video player" />
      <p role="status">{message}</p>
      {error && (
        <div className="video-error">
          <p role="alert">{error}</p>
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              setRetry((value) => value + 1);
            }}
          >
            Retry video
          </button>
        </div>
      )}
    </>
  );
}
export function YouTubePlayer({ videos }: { videos: { title: string; url: string }[] }) {
  const playable = videos
    .flatMap((video) => {
      const id = videoId(video.url);
      return id ? [{ id, title: video.title }] : [];
    })
    .filter((video, index, all) => all.findIndex((item) => item.id === video.id) === index);
  const [selected, setSelected] = useState(playable[0]?.id ?? '');
  const current = playable.find((video) => video.id === selected) ?? playable[0];
  return (
    <section className="youtube-player" aria-label="Listen on YouTube">
      <h3>Listen on YouTube</h3>
      {current ? (
        <>
          <label htmlFor="youtube-video">
            Attached YouTube video
            <select
              id="youtube-video"
              value={current.id}
              onChange={(event) => {
                setSelected(event.target.value);
              }}
            >
              {playable.map((video) => (
                <option value={video.id} key={video.id}>
                  {video.title || 'Untitled video'}
                </option>
              ))}
            </select>
          </label>
          <Video key={current.id} id={current.id} />
        </>
      ) : (
        <p>No playable YouTube videos are attached to this release.</p>
      )}
    </section>
  );
}
