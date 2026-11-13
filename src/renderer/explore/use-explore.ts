import { useState } from 'react';
import type { DiscogsBridge, DiscogsRelease, DiscogsResult } from '../../shared/discogs';
import type { FollowTopic } from '../../shared/following';
import type { SearchPage } from '../../shared/search';
import { filtersForTopic } from '../../shared/discovery';

export type ExploreView =
  | { kind: 'catalogue'; matches: SearchPage }
  | { kind: 'discover'; releases: SearchPage['releases'] };

export function useExplore(bridge: DiscogsBridge | undefined, onUnauthorized: () => void) {
  const [topic, setTopic] = useState<FollowTopic | null>(null);
  const [view, setView] = useState<ExploreView | null>(null);
  const [release, setRelease] = useState<DiscogsRelease | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function perform<T>(operation: () => Promise<DiscogsResult<T>>, apply: (value: T) => void) {
    setBusy(true);
    setError(null);
    try {
      const result = await operation();
      if (result.ok) apply(result.value);
      else {
        if (result.error.code === 'unauthorized') onUnauthorized();
        setError(result.error.message);
      }
    } catch {
      setError('Explore could not reach Discogs. Please retry.');
    } finally {
      setBusy(false);
    }
  }

  return {
    topic,
    view,
    release,
    busy,
    error,
    discoverAvailable: Boolean(bridge?.discover),
    reset: () => {
      setTopic(null);
      setView(null);
      setRelease(null);
      setError(null);
    },
    browse: async (next: FollowTopic, page = 1) => {
      if (!bridge || busy) return;
      setTopic(next);
      setView(null);
      setRelease(null);
      await perform(
        () => bridge.search({ filters: filtersForTopic(next), page, context: 'explore' }),
        (matches) => {
          setView({ kind: 'catalogue', matches });
        },
      );
    },
    discover: async () => {
      const discover = bridge?.discover;
      if (!discover || busy) return;
      setView(null);
      await perform(
        () => discover(topic),
        (releases) => {
          setView({ kind: 'discover', releases });
        },
      );
    },
    open: async (id: number, markSeen: (id: number) => void) => {
      if (!bridge || busy) return;
      await perform(
        () => bridge.loadRelease(id),
        (value) => {
          setRelease(value);
          markSeen(value.id);
        },
      );
    },
    back: () => {
      setRelease(null);
      setError(null);
    },
  };
}
