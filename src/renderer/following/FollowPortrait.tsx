import { useEffect, useRef, useState } from 'react';
import { Disc3, Tags, UserRound } from 'lucide-react';
import { followTopicKey } from '../../shared/following';
import type { FollowTopic } from '../../shared/following';
import type { createPortraitQueue } from './portrait-queue';
import type { DiscogsBridge } from '../../shared/discogs';

const icons = { artist: UserRound, label: Disc3, genre: Tags };

export function FollowPortrait({
  topic,
  lookup,
  enqueue,
  cache,
  onUnauthorized,
}: {
  topic: FollowTopic;
  lookup: DiscogsBridge['topicArtwork'];
  enqueue: ReturnType<typeof createPortraitQueue>;
  cache: Map<string, string | null>;
  onUnauthorized: () => void;
}) {
  const { kind, name } = topic;
  const key = followTopicKey(topic);
  const portrait = useRef<HTMLSpanElement>(null);
  const [url, setUrl] = useState(() => cache.get(key) ?? null);
  useEffect(() => {
    const element = portrait.current;
    if (!element || !lookup || kind === 'genre') return undefined;
    let active = true;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      enqueue(async () => {
        if (!active) return;
        const cached = cache.get(key);
        if (cached !== undefined) {
          setUrl(cached);
          return;
        }
        const result = await lookup({ kind, name });
        if (result.ok) {
          cache.set(key, result.value);
          if (active) setUrl(result.value);
        } else if (active && result.error.code === 'unauthorized') onUnauthorized();
      }).catch(() => undefined);
    });
    observer.observe(element);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [cache, enqueue, key, kind, lookup, name, onUnauthorized]);
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
