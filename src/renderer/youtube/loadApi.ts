import type { Result } from '../../shared/result';
import type { YouTubeApi } from './types';

let pending: Promise<Result<YouTubeApi, string>> | undefined;
export function loadYouTubeApi(): Promise<Result<YouTubeApi, string>> {
  if (window.YT?.Player) return Promise.resolve({ ok: true, value: window.YT });
  if (pending) return pending;
  pending = new Promise<Result<YouTubeApi, string>>((resolve) => {
    const script = document.createElement('script');
    let timer: number | undefined;
    const finish = (result: Result<YouTubeApi, string>) => {
      clearTimeout(timer);
      delete window.onYouTubeIframeAPIReady;
      script.onerror = null;
      if (!result.ok) script.remove();
      resolve(result);
    };
    timer = window.setTimeout(() => {
      finish({
        ok: false,
        error: 'YouTube took too long to load. Check your connection and retry.',
      });
    }, 10000);
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      finish({ ok: false, error: 'Could not load YouTube. Check your connection and retry.' });
    };
    window.onYouTubeIframeAPIReady = () => {
      finish(
        window.YT
          ? { ok: true, value: window.YT }
          : { ok: false, error: 'YouTube did not initialize. Please retry.' },
      );
    };
    document.head.append(script);
  }).then((result) => {
    if (!result.ok) pending = undefined;
    return result;
  });
  return pending;
}
