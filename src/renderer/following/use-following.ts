import { useEffect, useState } from 'react';
import { followTopicKey } from '../../shared/following';
import type { FollowTopic, FollowingBridge } from '../../shared/following';

export function useFollowing(bridge: FollowingBridge | undefined) {
  const [topics, setTopics] = useState<FollowTopic[]>([]);
  const [busy, setBusy] = useState(Boolean(bridge));
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!bridge) return undefined;
    let active = true;
    bridge
      .read()
      .then((result) => {
        if (!active) return;
        if (result.ok) {
          setTopics(result.value);
          setReady(true);
          setError(null);
        } else setError(result.error.message);
        setBusy(false);
      })
      .catch(() => {
        if (!active) return;
        setError('Your following list could not be reached. Please retry.');
        setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [bridge, revision]);

  return {
    topics,
    available: Boolean(bridge),
    enabled: ready && !busy,
    busy,
    error,
    isFollowed: (topic: FollowTopic) =>
      topics.some((item) => followTopicKey(item) === followTopicKey(topic)),
    retry: () => {
      setBusy(true);
      setRevision((value) => value + 1);
    },
    async setFollowed(topic: FollowTopic, followed: boolean) {
      if (!bridge || busy || !ready) return;
      setBusy(true);
      try {
        const result = await bridge.setFollowed({ topic, followed });
        if (result.ok) {
          setTopics(result.value);
          setError(null);
        } else setError(result.error.message);
      } catch {
        setError('Your following list could not be reached. Please retry.');
      } finally {
        setBusy(false);
      }
    },
  };
}
