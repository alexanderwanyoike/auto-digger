import { useCallback, useEffect, useRef, useState } from 'react';
import { cleanSoulseekQuery } from '../../shared/soulseek';
import type { SoulseekBridge, SoulseekResults } from '../../shared/soulseek';

export function useSoulseekSearch(bridge: SoulseekBridge | undefined, initial: string) {
  const [query, edit] = useState(cleanSoulseekQuery(initial));
  const [searchId, setSearchId] = useState<string | null>(null);
  const [results, setResults] = useState<SoulseekResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const version = useRef(0);
  const search = useCallback(
    async (value: string) => {
      version.current += 1;
      const { current } = version;
      const cleaned = cleanSoulseekQuery(value);
      edit(cleaned);
      setSearchId(null);
      setResults(null);
      setError(null);
      setStarting(true);
      try {
        if (!bridge) {
          setError('Open the desktop app and connect slskd in Settings.');
          return;
        }
        const result = await bridge.search(cleaned);
        if (current !== version.current) {
          if (result.ok) await bridge.stop(result.value.id);
          return;
        }
        if (result.ok) setSearchId(result.value.id);
        else setError(result.error.message);
      } catch {
        if (current === version.current) setError('Soulseek search could not start. Please retry.');
      } finally {
        if (current === version.current) setStarting(false);
      }
    },
    [bridge],
  );
  useEffect(() => {
    search(initial).catch(() => undefined);
    return () => {
      version.current += 1;
    };
  }, [initial, search]);
  useEffect(() => {
    if (!searchId || !bridge) return undefined;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function poll() {
      try {
        const result = await bridge?.results(searchId ?? '');
        if (!active || !result) return;
        if (!result.ok) {
          setError(result.error.message);
          return;
        }
        setResults(result.value);
        if (!result.value.complete)
          timer = setTimeout(() => {
            poll().catch(() => undefined);
          }, 750);
      } catch {
        if (active) setError('Soulseek results could not be refreshed. Search again.');
      }
    }
    poll().catch(() => undefined);
    return () => {
      active = false;
      clearTimeout(timer);
      bridge.stop(searchId).catch(() => undefined);
    };
  }, [bridge, searchId]);
  return {
    query,
    edit,
    search,
    results,
    error,
    searching: starting || (searchId !== null && !results?.complete && error === null),
  };
}
