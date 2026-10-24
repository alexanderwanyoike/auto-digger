import { useEffect, useId, useState } from 'react';
import type { z } from 'zod';
import type { markedTrackSchema } from '../../shared/catalogue';
import type { useCrate } from './useCrate';

export function TrackMarks({
  track,
  releaseId,
  crate,
}: {
  track: z.infer<typeof markedTrackSchema>;
  releaseId: number;
  crate: ReturnType<typeof useCrate>;
}) {
  const [picked, setPicked] = useState(track.picked);
  const pickId = useId();
  const [tags, setTags] = useState(track.tags.join(', '));
  const savedTags = track.tags.join(', ');
  useEffect(() => {
    setPicked(track.picked);
  }, [track.picked]);
  useEffect(() => {
    setTags(savedTags);
  }, [savedTags]);
  const { catalogue } = crate;
  const save = (nextPick: boolean) =>
    catalogue.perform((api) =>
      api.annotate({
        crateId: catalogue.view.crateId ?? '',
        releaseId,
        trackKey: track.key,
        picked: nextPick,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      }),
    );
  return (
    <li className="track-mark">
      <label className="track-pick" htmlFor={pickId}>
        <input
          id={pickId}
          type="checkbox"
          aria-label={`Pick ${track.title}`}
          checked={picked}
          disabled={crate.busy}
          onChange={(event) => {
            const next = event.target.checked;
            setPicked(next);
            save(next)
              .then((result) => {
                if (!result.ok) setPicked(track.picked);
              })
              .catch(() => {
                setPicked(track.picked);
              });
          }}
        />
        <span className="track-position">{track.position || '•'}</span>
        <strong>{track.title}</strong>
        <span className="track-duration">{track.duration}</span>
      </label>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save(picked).catch(() => undefined);
        }}
      >
        <input
          aria-label={`Tags for ${track.title}`}
          value={tags}
          placeholder="Personal tags, comma separated"
          onChange={(event) => {
            setTags(event.target.value);
          }}
        />
        <button
          type="submit"
          className="secondary-button"
          aria-label={`Save tags for ${track.title}`}
          disabled={crate.busy}
        >
          Save tags
        </button>
      </form>
    </li>
  );
}
