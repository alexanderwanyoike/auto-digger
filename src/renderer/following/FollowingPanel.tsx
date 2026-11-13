import { Disc3, Tags, UserRound, X } from 'lucide-react';
import { followTopicKey } from '../../shared/following';
import type { useFollowing } from './use-following';

const groups = [
  { kind: 'artist', name: 'Artists', Icon: UserRound },
  { kind: 'label', name: 'Labels', Icon: Disc3 },
  { kind: 'genre', name: 'Genres', Icon: Tags },
] as const;

export function FollowingPanel({ following }: { following: ReturnType<typeof useFollowing> }) {
  return (
    <section className="following-panel" aria-labelledby="following-heading">
      <h2 id="following-heading">Following</h2>
      {!following.topics.length && !following.busy && !following.error && (
        <p>No artists, labels or genres followed yet.</p>
      )}
      <div className="following-groups">
        {groups.map(({ kind, name, Icon }) => {
          const topics = following.topics.filter((topic) => topic.kind === kind);
          if (!topics.length) return null;
          return (
            <section key={kind}>
              <h3>
                <Icon size={15} aria-hidden="true" />
                {name}
              </h3>
              <ul>
                {topics.map((topic) => (
                  <li key={followTopicKey(topic)}>
                    <span>{topic.name}</span>
                    <button
                      type="button"
                      className="icon-button"
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
            </section>
          );
        })}
      </div>
    </section>
  );
}
