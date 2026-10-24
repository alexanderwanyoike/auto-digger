import { useEffect, useState } from 'react';
import type { AudioBridge, AudioResult, DownloadInput, LocalTrack } from '../../shared/audio';
import { audioFailure } from '../../shared/audioFailure';

export function useAudioLibrary(bridge: AudioBridge | undefined) {
  const [tracks, setTracks] = useState<LocalTrack[]>([]);
  const [playback, setPlayback] = useState<{ track: LocalTrack | null; request: number }>({
    track: null,
    request: 0,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    bridge
      ?.list()
      .then((result) => {
        if (!active) return;
        if (result.ok) {
          setTracks(result.value);
          setPlayback({ track: result.value[0] ?? null, request: 0 });
        } else setError(result.error.message);
      })
      .catch(() => {
        if (active)
          setError('Your downloaded tracks could not be loaded. Restart Auto Digger to retry.');
      });
    return () => {
      active = false;
    };
  }, [bridge]);
  function play(track: LocalTrack) {
    setPlayback((previous) => ({ track, request: previous.request + 1 }));
  }
  async function download(input: DownloadInput): Promise<AudioResult<LocalTrack>> {
    setBusy(true);
    setError(null);
    try {
      const result = bridge
        ? await bridge.download(input)
        : audioFailure<LocalTrack>('unavailable', 'Open the desktop app to download audio.');
      if (result.ok) {
        setTracks((previous) => [
          ...previous.filter((track) => track.id !== result.value.id),
          result.value,
        ]);
        play(result.value);
      }
      return result;
    } catch {
      return audioFailure('unavailable', 'This download could not finish. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  async function reveal(id?: string) {
    setError(null);
    try {
      const result = bridge
        ? await bridge.reveal(id)
        : audioFailure('unavailable', 'Open the desktop app to find your downloads.');
      if (!result.ok) setError(result.error.message);
    } catch {
      setError('Your file explorer could not open. Try again.');
    }
  }
  return {
    tracks,
    playback,
    busy,
    error,
    bridge,
    available: Boolean(bridge),
    play,
    download,
    reveal,
  };
}
