import { useEffect, useRef, useState } from 'react';
import type { AudioBridge, AudioResult, DownloadInput, LocalTrack } from '../../shared/audio';
import { downloadedPlayback } from '../../shared/playback';
import type { PlaybackItem } from '../../shared/playback';
import { audioFailure } from '../../shared/audioFailure';

export function useAudioLibrary(bridge: AudioBridge | undefined) {
  const actions = useRef(0);
  const [tracks, setTracks] = useState<LocalTrack[]>([]);
  const [playback, setPlayback] = useState<{ track: PlaybackItem | null; request: number }>({
    track: null,
    request: 0,
  });
  const [previewing, setPreviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const version = actions.current;
    bridge
      ?.list()
      .then((result) => {
        if (!active) return;
        if (result.ok) {
          setTracks((previous) => [
            ...result.value.filter((saved) => !previous.some((track) => track.id === saved.id)),
            ...previous,
          ]);
          if (version === actions.current)
            setPlayback({
              track: result.value[0] ? downloadedPlayback(result.value[0]) : null,
              request: 0,
            });
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
    actions.current += 1;
    setPreviewing(false);
    bridge
      ?.stopPreview()
      .then((result) => {
        if (!result.ok) setError(result.error.message);
      })
      .catch(() => undefined);
    setPlayback((previous) => ({
      track: downloadedPlayback(track),
      request: previous.request + 1,
    }));
  }
  async function preview(input: DownloadInput) {
    actions.current += 1;
    const version = actions.current;
    setPreviewing(true);
    setError(null);
    setPlayback((previous) => ({ track: null, request: previous.request }));
    try {
      const result = bridge
        ? await bridge.preview(input)
        : audioFailure<PlaybackItem>('unavailable', 'Open the desktop app to preview audio.');
      if (version !== actions.current) return;
      if (result.ok)
        setPlayback((previous) => ({ track: result.value, request: previous.request + 1 }));
      else setError(result.error.message);
    } catch {
      if (version === actions.current)
        setError('This preview could not start. Try another source.');
    } finally {
      if (version === actions.current) setPreviewing(false);
    }
  }
  async function stopPreview() {
    actions.current += 1;
    setPreviewing(false);
    setPlayback((previous) => ({ track: null, request: previous.request }));
    if (bridge) {
      const result = await bridge.stopPreview();
      if (!result.ok) setError(result.error.message);
    }
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
    previewing,
    preview,
    stopPreview,
    busy,
    error,
    bridge,
    available: Boolean(bridge),
    play,
    download,
    reveal,
  };
}
