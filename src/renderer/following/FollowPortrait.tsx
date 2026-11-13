import { useEffect, useRef, useState } from 'react';
import { Disc3, Tags, UserRound } from 'lucide-react';
import type { FollowTopic } from '../../shared/following';
import type { DiscogsBridge } from '../../shared/discogs';

const icons = { artist: UserRound, label: Disc3, genre: Tags };

export function FollowPortrait({
  topic,
  lookup,
  cache,
  onUnauthorized,
}: {
  topic: FollowTopic;
  lookup: DiscogsBridge['topicArtwork'];
  cache: Map<string, string | null>;
  onUnauthorized: () => void;
}) {
  const { kind, name } = topic;
  const key = `${kind}:${name}`;
  const portrait = useRef<HTMLSpanElement>(null);
  const [url, setUrl] = useState(() => cache.get(key) ?? null);
  useEffect(() => {
    const element = portrait.current;
    if (!element || !lookup || kind === 'genre' || cache.has(key)) return undefined;
    let active = true;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      lookup({ kind, name })
        .then((result) => {
          if (!active) return;
          if (result.ok) {
            cache.set(key, result.value);
            setUrl(result.value);
          } else if (result.error.code === 'unauthorized') onUnauthorized();
        })
        .catch(() => undefined);
    });
    observer.observe(element);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [cache, key, kind, lookup, name, onUnauthorized]);
  const Icon = icons[kind];
  return (
    <span ref={portrait} className={`follow-portrait follow-portrait-${kind}`} aria-hidden="true">
      {url ? (
        <img
          src={url}
          alt=""
          onError={() => {
            cache.set(key, null);
            setUrl(null);
          }}
        />
      ) : (
        <Icon size={32} strokeWidth={1.2} />
      )}
    </span>
  );
}
