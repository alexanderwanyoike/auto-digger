import { useEffect, useRef, useState } from 'react';
import type {
  Playlist,
  PlaylistsBridge,
  PlaylistsResult,
  PlaylistTrack,
} from '../../shared/playlists';
import { catalogueFailure } from '../../shared/catalogue-failure';
import { downloadSourceId } from '../../shared/download-source-id';
import type { useAudioLibrary } from '../audio/use-audio-library';
import { sourceAssignment } from '../audio/source-assignment';
import { localPlaylistTrack, playlistJob, playlistSource } from './playlist-audio';

const unavailable = 'Your playlists could not be reached. Please retry.';

export function usePlaylists(
  bridge: PlaylistsBridge | undefined,
  audio: ReturnType<typeof useAudioLibrary>,
) {
  const [lists, setLists] = useState<Playlist[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(Boolean(bridge));
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const preparing = useRef(new Set<string>());

  useEffect(() => {
    if (!bridge) return undefined;
    let active = true;
    bridge
      .read()
      .then((result) => {
        if (!active) return;
        if (result.ok) {
          setLists(result.value);
          setReady(true);
          setError(null);
        } else setError(result.error.message);
        setBusy(false);
      })
      .catch(() => {
        if (!active) return;
        setError(unavailable);
        setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [bridge, revision]);

  async function mutate(
    operation: (api: PlaylistsBridge) => Promise<PlaylistsResult>,
  ): Promise<PlaylistsResult> {
    if (!bridge || !ready || busy) return catalogueFailure('unavailable', unavailable);
    setBusy(true);
    setError(null);
    try {
      const result = await operation(bridge);
      if (result.ok) setLists(result.value);
      else setError(result.error.message);
      return result;
    } catch {
      setError(unavailable);
      return catalogueFailure('unavailable', unavailable);
    } finally {
      setBusy(false);
    }
  }

  async function queueAudio(track: PlaylistTrack) {
    if (!audio.bridge || !audio.queue.available || localPlaylistTrack(track, audio.tracks)) return;
    const source = playlistSource(track);
    if (!source) return;
    const job = playlistJob(track, audio.queue.jobs);
    if (job && job.stage !== 'failed' && job.stage !== 'cancelled') return;
    const id = downloadSourceId(source);
    const video = source.release.videos[source.videoIndex];
    if (!id || !video || preparing.current.has(id)) return;
    preparing.current.add(id);
    try {
      const checked = await audio.bridge.probe(video.url);
      if (
        !checked.ok ||
        sourceAssignment(track.release, source.videoIndex, checked, undefined, undefined)
          .selected !== track.trackIndex
      )
        return;
      const result = await audio.queue.enqueue(source);
      if (!result.ok) setError(`Track saved to playlist. ${result.error.message}`);
    } catch {
      setError('Track saved to playlist. Audio could not be queued.');
    } finally {
      preparing.current.delete(id);
    }
  }

  return {
    lists,
    busy,
    error,
    available: Boolean(bridge),
    enabled: ready && !busy,
    reload: () => {
      setBusy(true);
      setRevision((value) => value + 1);
    },
    create: (name: string) => mutate((api) => api.create(name)),
    remove: (playlistId: string, entryId: string) =>
      mutate((api) => api.remove({ playlistId, entryId })),
    async add(playlistId: string, track: PlaylistTrack) {
      const saved = await mutate((api) => api.add({ playlistId, track }));
      if (saved.ok) await queueAudio(track);
      return saved;
    },
  };
}
