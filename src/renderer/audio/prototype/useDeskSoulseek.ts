import { useEffect, useState } from 'react';
import type { Result } from '../../../shared/result';
import { demoCandidates, demoTracks } from './demoData';
import type { DemoCandidate, DemoTrack } from './demoData';

interface Failure {
  code: 'private' | 'busy' | 'saved';
  message: string;
}
export function useDeskSoulseek() {
  const [track, setTrack] = useState<DemoTrack | null>(null);
  const [query, setQuery] = useState('');
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<DemoCandidate | null>(null);
  const [saved, setSaved] = useState<Record<string, DemoCandidate>>({});
  const scenario = new URLSearchParams(window.location.search).get('scenario') ?? 'normal';
  const cleaned = query.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  useEffect(() => {
    if (!pending) return undefined;
    const timer = setTimeout(() => {
      setSaved((previous) => ({ ...previous, [pending.trackId]: pending }));
      setPending(null);
      setTrack((current) => (current?.id === pending.trackId ? null : current));
    }, 450);
    return () => {
      clearTimeout(timer);
    };
  }, [pending]);
  function queue(candidate: DemoCandidate): Result<undefined, Failure> {
    if (candidate.access === 'private')
      return { ok: false, error: { code: 'private', message: 'This file is private.' } };
    if (pending)
      return { ok: false, error: { code: 'busy', message: 'Another demo download is running.' } };
    if (saved[candidate.trackId])
      return { ok: false, error: { code: 'saved', message: 'This track is already saved.' } };
    setPending(candidate);
    return { ok: true, value: undefined };
  }
  function download(candidate: DemoCandidate) {
    const result = queue(candidate);
    setError(result.ok ? null : result.error.message);
  }
  return {
    track,
    query,
    cleaned,
    checked,
    scenario,
    pending,
    saved,
    error,
    download,
    open: (index: number) => {
      const selected = demoTracks[index];
      if (!selected) return;
      setTrack(selected);
      setQuery(`${selected.artist} - ${selected.title}`);
      setChecked(true);
      setError(null);
    },
    close: () => {
      setTrack(null);
    },
    edit: (value: string) => {
      setQuery(value);
      setChecked(false);
      setError(null);
    },
    search: () => {
      setChecked(Boolean(cleaned));
      setError(cleaned ? null : 'Add a few letters or numbers to search.');
    },
    youtube: (index: number) => {
      const selected = demoTracks[index];
      const candidate =
        selected && demoCandidates(selected).find((item) => item.provider === 'YouTube');
      if (candidate) download(candidate);
    },
  };
}
