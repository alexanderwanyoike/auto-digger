import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { followTopicKey } from '../../shared/following';
import type { FollowTopic } from '../../shared/following';
import type { DiscogsBridge } from '../../shared/discogs';
import type { useFollowing } from './use-following';
import { createPortraitQueue } from './portrait-queue';
import { FollowPortrait } from './FollowPortrait';

const groups = [
  { kind: 'artist', name: 'Artists' },
  { kind: 'label', name: 'Labels' },
  { kind: 'genre', name: 'Genres' },
] as const;
const pageSize = 24;

export function FollowingPanel({
  following,
  browseDisabled,
  onBrowse,
  onPageChange,
  lookup,
  active,
  onUnauthorized,
}: {
  following: ReturnType<typeof useFollowing>;
  browseDisabled: boolean;
  onBrowse: (topic: FollowTopic) => void;
  onPageChange: () => void;
  lookup: DiscogsBridge['topicArtwork'];
  active: boolean;
  onUnauthorized: () => void;
}) {
  const [kind, setKind] = useState<FollowTopic['kind']>(
    () => following.topics[0]?.kind ?? 'artist',
  );
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [enqueue] = useState(createPortraitQueue);
  const cache = useRef(new Map<string, string | null>());
  const topics = following.topics.filter(
    (topic) => topic.kind === kind && topic.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const lastPage = Math.max(0, Math.ceil(topics.length / pageSize) - 1);
  const current = Math.min(page, lastPage);
  const visible = topics.slice(current * pageSize, (current + 1) * pageSize);

  return (
    <section className="following-gallery" aria-label="Following">
      <header className="following-gallery-header">
        <div className="section-switcher" role="group" aria-label="Follow type">
          {groups.map((group) => (
            <button
              type="button"
              key={group.kind}
              aria-pressed={group.kind === kind}
              onClick={() => {
                setKind(group.kind);
                setQuery('');
                setPage(0);
              }}
            >
              {group.name}
            </button>
          ))}
        </div>
        <input
          type="search"
          aria-label="Search follows"
          placeholder="Search follows"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(0);
          }}
        />
      </header>
      {!visible.length && !following.busy && !following.error && (
        <p>No {groups.find((group) => group.kind === kind)?.name.toLowerCase()} found.</p>
      )}
      <ul>
        {visible.map((topic) => (
          <li key={followTopicKey(topic)}>
            <button
              type="button"
              className="follow-topic"
              aria-label={`Browse ${topic.name}`}
              disabled={browseDisabled}
              onClick={() => {
                onBrowse(topic);
              }}
            >
              <FollowPortrait
                topic={topic}
                lookup={active ? lookup : undefined}
                enqueue={enqueue}
                cache={cache.current}
                onUnauthorized={onUnauthorized}
              />
              <strong>{topic.name}</strong>
            </button>
            <button
              type="button"
              className="icon-button unfollow-topic"
              aria-label={`Unfollow ${kind} ${topic.name}`}
              title={`Unfollow ${topic.name}`}
              disabled={!following.enabled}
              onClick={() => {
                following.setFollowed(topic, false).catch(() => undefined);
              }}
            >
              <X size={15} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      {lastPage > 0 && (
        <nav aria-label="Following pages">
          <button
            className="secondary-button"
            type="button"
            disabled={current === 0}
            onClick={() => {
              setPage(current - 1);
              onPageChange();
            }}
          >
            Previous page
          </button>
          <span>
            {current + 1} / {lastPage + 1}
          </span>
          <button
            className="secondary-button"
            type="button"
            disabled={current === lastPage}
            onClick={() => {
              setPage(current + 1);
              onPageChange();
            }}
          >
            Next page
          </button>
        </nav>
      )}
    </section>
  );
}
