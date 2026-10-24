import { useCallback, useEffect, useRef, useState } from 'react';
import type { AudioResult, LocalTrack } from '../../shared/audio';
import { audioFailure } from '../../shared/audioFailure';

const unavailableAudio =
  'This saved audio could not be played. It may have been moved or removed. Check its folder and try again.';

export function useLocalPlayer(track: LocalTrack | null, request: number) {
  const [media] = useState(() => new Audio());
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [error, setError] = useState<string | null>(null);
  const requested = useRef(0);
  const handled = useRef(0);
  const start = useCallback(async (): Promise<AudioResult<undefined>> => {
    try {
      await media.play();
      return { ok: true, value: undefined };
    } catch (failure) {
      const message =
        failure instanceof DOMException && failure.name === 'NotAllowedError'
          ? 'Ready to listen. Press play to start this saved track.'
          : unavailableAudio;
      return audioFailure('unavailable', message);
    }
  }, [media]);
  useEffect(() => {
    const update = () => {
      setPosition(media.currentTime);
      setDuration(Number.isFinite(media.duration) ? media.duration : 0);
    };
    const onPlay = () => {
      setPlaying(true);
      setError(null);
    };
    const onPause = () => {
      setPlaying(false);
    };
    const onError = () => {
      setPlaying(false);
      setError(unavailableAudio);
    };
    const ready = () => {
      update();
      if (requested.current > handled.current) {
        handled.current = requested.current;
        start()
          .then((result) => {
            if (!result.ok) setError(result.error.message);
          })
          .catch(() => undefined);
      }
    };
    media.addEventListener('play', onPlay);
    media.addEventListener('pause', onPause);
    media.addEventListener('ended', onPause);
    media.addEventListener('timeupdate', update);
    media.addEventListener('loadedmetadata', update);
    media.addEventListener('canplay', ready);
    media.addEventListener('error', onError);
    return () => {
      media.pause();
      media.removeAttribute('src');
      media.removeEventListener('play', onPlay);
      media.removeEventListener('pause', onPause);
      media.removeEventListener('ended', onPause);
      media.removeEventListener('timeupdate', update);
      media.removeEventListener('loadedmetadata', update);
      media.removeEventListener('canplay', ready);
      media.removeEventListener('error', onError);
    };
  }, [media, start]);
  useEffect(() => {
    media.pause();
    setPosition(0);
    setDuration(0);
    setError(null);
    setPlaying(false);
    requested.current = request;
    if (track) media.src = `auto-digger-audio://track/${track.id}`;
    else media.removeAttribute('src');
    if (track && request > handled.current && media.readyState >= 3) {
      handled.current = request;
      start()
        .then((result) => {
          if (!result.ok) setError(result.error.message);
        })
        .catch(() => undefined);
    }
  }, [track, request, media, start]);
  useEffect(() => {
    media.volume = volume;
  }, [media, volume]);
  async function toggle() {
    if (!track) return;
    if (!media.paused) media.pause();
    else {
      const result = await start();
      if (!result.ok) setError(result.error.message);
    }
  }
  function seek(time: number) {
    media.currentTime = time;
    setPosition(time);
  }
  return { playing, position, duration, volume, setVolume, toggle, seek, error };
}
