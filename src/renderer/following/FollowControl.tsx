import { BookmarkCheck, BookmarkPlus } from 'lucide-react';
import { useContext } from 'react';
import type { FollowTopic } from '../../shared/following';
import { FollowingContext } from './following-context';

export function FollowControl({
  topic,
  showName = false,
}: {
  topic: FollowTopic;
  showName?: boolean;
}) {
  const following = useContext(FollowingContext);
  if (!following?.available || !topic.name.trim()) return null;
  const followed = following.isFollowed(topic);
  const Icon = followed ? BookmarkCheck : BookmarkPlus;
  return (
    <button
      type="button"
      className="follow-control"
      aria-label={`Follow ${topic.kind} ${topic.name}`}
      aria-pressed={followed}
      title={`${followed ? 'Unfollow' : 'Follow'} ${topic.name}`}
      disabled={!following.enabled}
      onClick={() => {
        following.setFollowed(topic, !followed).catch(() => undefined);
      }}
    >
      <Icon size={14} aria-hidden="true" />
      {showName && topic.name}
    </button>
  );
}
