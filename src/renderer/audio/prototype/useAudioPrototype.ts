import { useState } from 'react';
import { demoTracks } from './demoData';
import type { DemoCandidate, DemoTrack } from './demoData';
import { demoDestination } from './destination';
import { useDemoCopies } from './useDemoCopies';

export function useAudioPrototype() {
  const library = useDemoCopies();
  const [track, setTrack] = useState(demoTracks[0]);
  const [query, setQuery] = useState(`${track.artist} - ${track.title}`);
  const [scenario, setScenario] = useState('normal');
  const [checked, setChecked] = useState(false);
  const [showPrivate, setShowPrivate] = useState(true);
  const [confirmation, setConfirmation] = useState<DemoCandidate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [folder, setFolder] = useState('Music/Auto Digger');
  const [layout, setLayout] = useState('release');
  const [separate, setSeparate] = useState(false);
  const cleaned = query.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  function queue(candidate: DemoCandidate) {
    const another = library.copies.some((copy) => copy.candidate.trackId === candidate.trackId);
    const path = demoDestination(track, folder, layout, separate, candidate.provider, another);
    const result = library.queue(candidate, path);
    setError(result.ok ? null : result.error.message);
    setConfirmation(null);
  }
  function selectTrack(next: DemoTrack) {
    setTrack(next);
    setQuery(`${next.artist} - ${next.title}`);
    setChecked(false);
    setError(null);
    setConfirmation(null);
  }
  return {
    library,
    track,
    selectTrack,
    query,
    cleaned,
    setQuery: (value: string) => {
      setQuery(value);
      setChecked(false);
      setError(null);
    },
    scenario,
    setScenario: (value: string) => {
      setScenario(value);
      setChecked(false);
    },
    checked,
    showPrivate,
    setShowPrivate,
    confirmation,
    cancelConfirmation: () => {
      setConfirmation(null);
    },
    confirm: () => {
      if (confirmation) queue(confirmation);
    },
    error,
    folder,
    setFolder,
    layout,
    setLayout,
    separate,
    setSeparate,
    check: () => {
      setError(cleaned ? null : 'Add letters or numbers before checking sources.');
      setChecked(Boolean(cleaned));
    },
    save: (candidate: DemoCandidate) => {
      if (library.active) {
        setError('Finish or cancel the current demo transfer first.');
        return;
      }
      if (library.copies.some((copy) => copy.candidate.trackId === candidate.trackId))
        setConfirmation(candidate);
      else queue(candidate);
    },
  };
}
