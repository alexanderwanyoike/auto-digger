import { useEffect, useRef, useState } from 'react';
import type { AudioBridge, AudioResult, DownloadInput, LocalTrack } from '../../shared/audio';
import type { DownloadJobsBridge } from '../../shared/download-jobs';
import { useDownloadJobs } from './use-download-jobs';
import type { PlaybackItem } from '../../shared/playback';
import { audioFailure } from '../../shared/audio-failure';
import { downloadSourceId } from '../../shared/download-source-id';

export function downloadedPlayback(track: LocalTrack): PlaybackItem {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album,
    artworkUrl: track.artworkUrl,
    url: `auto-digger-audio://track/${track.id}`,
  };
}

export function useAudioLibrary(
  bridge: AudioBridge | undefined,
  jobsBridge: DownloadJobsBridge | undefined = window.downloadJobs,
) {
  const queue = useDownloadJobs(jobsBridge);
  const { completionKey } = queue;
  const actions = useRef(0);
  const preparing = useRef<DownloadInput | null>(null);
  const [preparingPreview, setPreparingPreview] = useState<DownloadInput | null>(null);
  const [tracks, setTracks] = useState<LocalTrack[]>([]);
  const [playback, setPlayback] = useState<{ track: PlaybackItem | null; request: number }>({
    track: null,
    request: 0,
  });
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
          const firstPlayable = result.value.find((track) => !track.missing);
          setTracks((previous) => [
            ...result.value.filter((saved) => !previous.some((track) => track.id === saved.id)),
            ...previous,
          ]);
          if (version === actions.current)
            setPlayback({
              track: firstPlayable ? downloadedPlayback(firstPlayable) : null,
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
  useEffect(() => {
    if (!completionKey || !bridge) return undefined;
    let active = true;
    bridge
      .list()
      .then((result) => {
        if (!active) return;
        if (result.ok) setTracks(result.value);
        else setError(result.error.message);
      })
      .catch(() => {
        if (active) setError('Your saved tracks could not be refreshed. Please retry.');
      });
    return () => {
      active = false;
    };
  }, [bridge, completionKey]);
  function play(track: LocalTrack) {
    if (track.missing) {
      setError(
        'This audio file is missing or unavailable. Restore it or download the source again.',
      );
      return;
    }
    actions.current += 1;
    setPlayback((previous) => ({
      track: downloadedPlayback(track),
      request: previous.request + 1,
    }));
  }
  async function download(input: DownloadInput): Promise<AudioResult<LocalTrack>> {
    setBusy(true);
    setError(null);
    try {
      const result = bridge
        ? await (queue.available ? queue.download(input) : bridge.download(input))
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
  async function downloadBatch(inputs: DownloadInput[]) {
    setBusy(true);
    setError(null);
    try {
      const result = await queue.batch(inputs);
      if (result.ok) {
        setTracks((previous) => [
          ...previous.filter(
            (track) => !result.value.tracks.some((saved) => saved.id === track.id),
          ),
          ...result.value.tracks,
        ]);
        const first = result.value.tracks[0];
        if (first) play(first);
      }
      return result;
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
    queue,
    downloadBatch,
    playback,
    preparingPreview,
    busy: busy && !queue.available,
    error,
    bridge,
    available: Boolean(bridge),
    play,
    async preview(input: DownloadInput): Promise<AudioResult<LocalTrack>> {
      const id = downloadSourceId(input);
      const saved = tracks.find((track) => track.id === id && !track.missing);
      if (saved) {
        play(saved);
        return { ok: true, value: saved };
      }
      if (preparing.current)
        return audioFailure(
          'busy',
          'Another preview is preparing. Cancel it before previewing another source.',
        );
      preparing.current = input;
      setPreparingPreview(input);
      try {
        const result = window.audioPreviews
          ? await window.audioPreviews.prepare(input)
          : audioFailure<LocalTrack>('unavailable', 'Open the desktop app to preview audio.');
        if (result.ok) {
          actions.current += 1;
          setPlayback((previous) => ({
            track: {
              ...downloadedPlayback(result.value),
              url: `auto-digger-audio://preview/${result.value.id}`,
              preview: true,
            },
            request: previous.request + 1,
          }));
        }
        return result;
      } catch {
        return audioFailure('unavailable', 'The preview could not start. Please retry.');
      } finally {
        preparing.current = null;
        setPreparingPreview(null);
      }
    },
    async cancelPreview(input: DownloadInput): Promise<AudioResult<undefined>> {
      const id = downloadSourceId(input);
      try {
        const result =
          id && window.audioPreviews
            ? await window.audioPreviews.cancel(id)
            : audioFailure<undefined>('unavailable', 'Choose an active preview.');
        if (!result.ok) setError(result.error.message);
        return result;
      } catch {
        const message = 'The preview could not be cancelled. Please retry.';
        setError(message);
        return audioFailure('unavailable', message);
      }
    },
    download,
    reveal,
  };
}
