import { useCallback, useEffect, useRef, useState } from 'react';
import { useRecommendationReleases } from './use-recommendation-releases';
import type { DiscogsRelease } from '../../shared/discogs';
import type { Recommendation, Recommendations } from '../../shared/cosine';
import type { useAudioLibrary } from '../audio/use-audio-library';
import type { RecommendationSeed } from './recommendations-context';

export function useRecommendations(
  release: DiscogsRelease | null,
  onOpen: (value: DiscogsRelease) => void,
  audio: ReturnType<typeof useAudioLibrary>,
) {
  const bridge = window.cosine;
  const [configured, setConfigured] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'release' | null>(null);
  const [seed, setSeed] = useState<RecommendationSeed | null>(null);
  const [origin, setOrigin] = useState<DiscogsRelease | null>(null);
  const [data, setData] = useState<Recommendations | null>(null);
  const [fromYear, setFromYear] = useState('');
  const [toYear, setToYear] = useState('');
  const [busy, setBusy] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const firstOrigin = useRef<DiscogsRelease | null>(null);
  const expectedRelease = useRef<DiscogsRelease | null>(null);
  const { covers, read, clear } = useRecommendationReleases(bridge, data);
  const dismiss = useCallback(() => {
    generation.current += 1;
    firstOrigin.current = null;
    expectedRelease.current = null;
    clear();
    setView(null);
    setOrigin(null);
    setData(null);
    setBusy(false);
    setActing(null);
    setError(null);
  }, [clear]);
  useEffect(() => {
    let active = true;
    bridge
      ?.status()
      .then((result) => {
        if (!active) return;
        if (result.ok) setConfigured(result.value.configured);
        else setConnectionError(result.error.message);
      })
      .catch(() => {
        if (active) setConnectionError('Cosine settings could not be loaded. Please retry.');
      });
    return () => {
      active = false;
      generation.current += 1;
    };
  }, [bridge]);
  useEffect(() => {
    if (expectedRelease.current && release !== expectedRelease.current) dismiss();
  }, [release, dismiss]);
  async function run(source: RecommendationSeed, from = fromYear, to = toYear) {
    if (!bridge) return;
    generation.current += 1;
    const version = generation.current;
    setView('list');
    setBusy(true);
    setActing(null);
    setError(null);
    setData(null);
    clear();
    try {
      const url = source.release.videos[source.videoIndex]?.url ?? '';
      const result = await bridge.similar({
        url,
        ...(from ? { fromYear: Number(from) } : {}),
        ...(to ? { toYear: Number(to) } : {}),
      });
      if (version !== generation.current) return;
      if (result.ok) setData(result.value);
      else setError(result.error.message);
    } catch {
      if (version === generation.current)
        setError('Recommendations could not be loaded. Please retry.');
    } finally {
      if (version === generation.current) setBusy(false);
    }
  }
  function find(source: RecommendationSeed) {
    firstOrigin.current ??= source.release;
    expectedRelease.current = source.release;
    setOrigin(firstOrigin.current);
    setSeed(source);
    setFromYear('');
    setToYear('');
    run(source, '', '').catch(() => undefined);
  }
  async function actOn(item: Recommendation, preview: boolean) {
    if (!bridge || busy || acting) return;
    const version = generation.current;
    setActing(item.id);
    setError(null);
    try {
      const result = await read(item);
      if (version !== generation.current) return;
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      if (preview) {
        if (result.value.videoIndex === null) {
          setError('This recommendation has no YouTube preview.');
          return;
        }
        const played = await audio.preview({
          release: result.value.release,
          videoIndex: result.value.videoIndex,
          trackIndex: result.value.trackIndex,
        });
        if (version === generation.current && !played.ok && played.error.code !== 'cancelled')
          setError(played.error.message);
      } else {
        expectedRelease.current = result.value.release;
        onOpen(result.value.release);
        setView('release');
      }
    } catch {
      if (version === generation.current)
        setError('The recommendation could not open. Please retry.');
    } finally {
      if (version === generation.current) setActing(null);
    }
  }
  return {
    bridge,
    covers,
    configured,
    connectionError,
    view,
    seed,
    origin,
    data,
    fromYear,
    toYear,
    setFromYear,
    setToYear,
    busy,
    acting,
    error,
    dismiss,
    find,
    configure: (value: boolean) => {
      setConfigured(value);
      setConnectionError(null);
      if (!value) dismiss();
    },
    refresh: () => {
      if (seed) run(seed).catch(() => undefined);
    },
    preview: (item: Recommendation) => {
      actOn(item, true).catch(() => undefined);
    },
    open: (item: Recommendation) => {
      actOn(item, false).catch(() => undefined);
    },
    back: () => {
      setView('list');
    },
    close: () => {
      const original = firstOrigin.current;
      dismiss();
      if (original) onOpen(original);
    },
  };
}
