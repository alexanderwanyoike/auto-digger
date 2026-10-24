import { useCallback, useEffect, useRef, useState } from 'react';
import type { AudioResult } from '../../shared/audio';
import type { PlaybackItem } from '../../shared/playback';
import { audioFailure } from '../../shared/audioFailure';

const unavailableAudio =
  'This saved audio could not be played. It may have been moved or removed. Check its folder and try again.';

export function usePlayer(track: PlaybackItem | null, request: number) {
  const [media] = useState(() => new Audio());
  const kind = useRef<PlaybackItem['source']>('download');
  const [buffering, setBuffering] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);
  const requested = useRef(0);
  const handled = useRef(0);
  const start = useCallback(async (): Promise<AudioResult<undefined>> => {
    const version = revision.current;
    try {
      await media.play();
      return { ok: true, value: undefined };
    } catch (failure) {
      if (version !== revision.current) return { ok: true, value: undefined };
      let message =
        kind.current === 'preview'
          ? 'This preview could not be played. Try another source or download the track.'
          : unavailableAudio;
      if (failure instanceof DOMException && failure.name === 'NotAllowedError')
        message = 'Ready to listen. Press play to start.';
      return audioFailure('unavailable', message);
    }
  }, [media]);
  useEffect(() => {
    const update = () => {
      setPosition(media.currentTime);
      setDuration(Number.isFinite(media.duration) ? media.duration : 0);
    };
    const onPlay = () => {
      setBuffering(false);
      setPlaying(true);
      setError(null);
    };
    const onPause = () => {
      setPlaying(false);
    };
    const onError = () => {
      setPlaying(false);
      setBuffering(false);
      setError(
        kind.current === 'preview'
          ? 'This preview could not be played. Try another source or download the track.'
          : unavailableAudio,
      );
    };
    const waiting = () => {
      setBuffering(true);
    };
    const ready = () => {
      setBuffering(false);
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
    media.addEventListener('waiting', waiting);
    media.addEventListener('stalled', waiting);
    media.addEventListener('play', onPlay);
    media.addEventListener('pause', onPause);
    media.addEventListener('ended', onPause);
    media.addEventListener('timeupdate', update);
    media.addEventListener('loadedmetadata', update);
    media.addEventListener('canplay', ready);
    media.addEventListener('error', onError);
    return () => {
      revision.current += 1;
      media.pause();
      media.removeAttribute('src');
      media.load();
      media.removeEventListener('waiting', waiting);
      media.removeEventListener('stalled', waiting);
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
    revision.current += 1;
    media.pause();
    setPosition(0);
    setDuration(0);
    setError(null);
    setPlaying(false);
    requested.current = request;
    kind.current = track?.source ?? 'download';
    setBuffering(track?.source === 'preview');
    if (track) media.src = track.url;
    else {
      media.removeAttribute('src');
      media.load();
    }
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
  return { buffering, playing, position, duration, volume, setVolume, toggle, seek, error };
}
