import { useEffect, useState } from 'react';
import type { AudioBridge, AudioResult, AudioSource } from '../../shared/audio';
import type { DiscogsRelease } from '../../shared/discogs';
import { audioFailure } from '../../shared/audioFailure';

export function useSources(release: DiscogsRelease, bridge: AudioBridge | undefined) {
  const [results, setResults] = useState<Record<number, AudioResult<AudioSource> | null>>({});
  useEffect(() => {
    let active = true;
    setResults({});
    async function check(index: number): Promise<void> {
      const video = release.videos[index];
      if (!active || !video || !bridge) return;
      let result: AudioResult<AudioSource>;
      try {
        result = await bridge.probe(video.url);
      } catch {
        result = audioFailure('network', 'This source could not be checked. Please retry.');
      }
      if (!active) return;
      setResults((previous) => ({ ...previous, [index]: result }));
      await check(index + 1);
    }
    check(0).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [release, bridge]);
  async function retry(index: number) {
    const video = release.videos[index];
    if (!video || !bridge) return;
    setResults((previous) => ({ ...previous, [index]: null }));
    let result: AudioResult<AudioSource>;
    try {
      result = await bridge.probe(video.url);
    } catch {
      result = audioFailure('network', 'This source could not be checked. Please retry.');
    }
    setResults((previous) => ({ ...previous, [index]: result }));
  }
  return { results, retry };
}
