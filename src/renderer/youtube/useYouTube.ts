import { useEffect, useRef, useState } from 'react';
import { loadYouTubeApi } from './loadApi';
import { playerError } from './playerError';
import type { YouTubeInstance } from './types';

export function useYouTube(id: string, retry: number) {
  const host = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState('Loading YouTube player…');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const container = host.current;
    if (!container) return undefined;
    let active = true;
    let visible = true;
    let failed = false;
    let ready = false;
    let timer: number | undefined;
    let player: YouTubeInstance | undefined;
    setMessage('Loading YouTube player…');
    setError(null);
    const destroyPlayer = () => {
      try {
        player?.destroy();
      } catch {
        container.replaceChildren();
      }
      player = undefined;
    };
    const fail = (reason: string) => {
      if (active && !failed) {
        failed = true;
        clearTimeout(timer);
        destroyPlayer();
        setError(reason);
        setMessage('Playback unavailable');
      }
    };
    const pause = () => {
      if (!ready || failed) return;
      try {
        player?.pauseVideo();
      } catch {
        fail('Could not pause this video. Select another video.');
      }
    };
    const visibility = () => {
      if (document.hidden) pause();
    };
    document.addEventListener('visibilitychange', visibility);
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? undefined
        : new IntersectionObserver(
            ([entry]) => {
              visible = Boolean(entry && entry.intersectionRatio >= 0.5);
              if (!visible) pause();
            },
            { threshold: 0.5 },
          );
    observer?.observe(container);
    timer = window.setTimeout(() => {
      fail('The player did not become ready. Check your connection and retry.');
    }, 15000);
    loadYouTubeApi()
      .then((result) => {
        if (!active || failed) return;
        if (!result.ok) {
          clearTimeout(timer);
          fail(result.error);
          return;
        }
        const mount = document.createElement('div');
        container.replaceChildren(mount);
        try {
          player = new result.value.Player(mount, {
            videoId: id,
            width: '100%',
            height: '270',
            playerVars: {
              playsinline: 1,
              autoplay: 0,
              ...(window.location.protocol === 'http:' || window.location.protocol === 'https:'
                ? { origin: window.location.origin }
                : {}),
            },
            events: {
              onReady: () => {
                if (active && !failed) {
                  clearTimeout(timer);
                  ready = true;
                  setMessage('Ready. Press play in the video.');
                  if (document.hidden || !visible) pause();
                }
              },
              onStateChange: ({ data }) => {
                if (active && !failed) {
                  if (data === 1 && (document.hidden || !visible)) pause();
                  const state: Record<number, string> = {
                    [-1]: 'Ready. Press play in the video.',
                    0: 'Ended',
                    1: 'Playing',
                    2: 'Paused',
                    3: 'Buffering…',
                    5: 'Ready. Press play in the video.',
                  };
                  setMessage(state[data] ?? 'Ready');
                }
              },
              onError: ({ data }) => {
                clearTimeout(timer);
                fail(playerError(data));
              },
              onAutoplayBlocked: () => {
                if (active && !failed) setMessage('Press play in the video to begin.');
              },
            },
          });
        } catch {
          clearTimeout(timer);
          fail('Could not create the YouTube player. Please retry.');
        }
      })
      .catch(() => {
        clearTimeout(timer);
        fail('Could not load the YouTube player. Please retry.');
      });
    return () => {
      active = false;
      clearTimeout(timer);
      observer?.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      destroyPlayer();
      container.replaceChildren();
    };
  }, [id, retry]);
  return { host, message, error };
}
