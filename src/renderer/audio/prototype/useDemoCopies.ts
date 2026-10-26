import { useState } from 'react';
import type { Result } from '../../../shared/result';
import type { DemoCandidate } from './demoData';

export interface DemoCopy {
  id: string;
  candidate: DemoCandidate;
  path: string;
}
interface DemoJob {
  candidate: DemoCandidate;
  path: string;
  stage: 'queued' | 'downloading' | 'importing' | 'complete';
}
export function useDemoCopies() {
  const [copies, setCopies] = useState<DemoCopy[]>([]);
  const [preferred, setPreferred] = useState<Record<string, string>>({});
  const [job, setJob] = useState<DemoJob | null>(null);
  const active = job !== null && job.stage !== 'complete';
  function queue(candidate: DemoCandidate, path: string): Result<undefined, { message: string }> {
    if (candidate.access === 'private')
      return { ok: false, error: { message: 'Private files are not downloadable in this demo.' } };
    if (active)
      return { ok: false, error: { message: 'Finish or cancel the current demo transfer first.' } };
    if (copies.some((copy) => copy.candidate.id === candidate.id))
      return { ok: false, error: { message: 'This source is already saved.' } };
    setJob({ candidate, path, stage: 'queued' });
    return { ok: true, value: undefined };
  }
  function advance() {
    if (!job || job.stage === 'complete') return;
    let stage: 'downloading' | 'importing' | 'complete' = 'complete';
    if (job.stage === 'queued') stage = 'downloading';
    if (job.stage === 'downloading') stage = 'importing';
    if (stage === 'complete') {
      const copy = { id: `copy-${job.candidate.id}`, candidate: job.candidate, path: job.path };
      setCopies((previous) => [...previous, copy]);
      setPreferred((previous) =>
        previous[job.candidate.trackId]
          ? previous
          : { ...previous, [job.candidate.trackId]: copy.id },
      );
    }
    setJob({ ...job, stage });
  }
  return {
    copies,
    preferred,
    job,
    active,
    queue,
    advance,
    cancel: () => {
      setJob(null);
    },
    prefer: (copy: DemoCopy) => {
      setPreferred((previous) => ({ ...previous, [copy.candidate.trackId]: copy.id }));
    },
  };
}
