import { useState } from 'react';
import type { Result } from '../../../shared/result';
import type { DemoCandidate } from './demoData';

export interface DemoCopy {
  id: string;
  candidate: DemoCandidate;
}
interface DemoJob {
  candidate: DemoCandidate;
  stage: 'queued' | 'downloading' | 'importing' | 'complete';
}
export function useDemoCopies() {
  const [copies, setCopies] = useState<DemoCopy[]>([]);
  const [preferred, setPreferred] = useState<Record<string, string>>({});
  const [job, setJob] = useState<DemoJob | null>(null);
  const active = job !== null && job.stage !== 'complete';
  function queue(candidate: DemoCandidate): Result<undefined, { message: string }> {
    if (candidate.access === 'private')
      return { ok: false, error: { message: 'Private files are not downloadable in this demo.' } };
    if (active)
      return { ok: false, error: { message: 'Finish or cancel the current demo transfer first.' } };
    if (copies.some((copy) => copy.candidate.id === candidate.id))
      return { ok: false, error: { message: 'This source is already saved.' } };
    setJob({ candidate, stage: 'queued' });
    return { ok: true, value: undefined };
  }
  function advance() {
    if (!job || job.stage === 'complete') return;
    const stage =
      job.stage === 'queued'
        ? 'downloading'
        : job.stage === 'downloading'
          ? 'importing'
          : 'complete';
    if (stage === 'complete') {
      const copy = { id: `copy-${job.candidate.id}`, candidate: job.candidate };
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
    cancel: () => setJob(null),
    prefer: (copy: DemoCopy) => {
      setPreferred((previous) => ({ ...previous, [copy.candidate.trackId]: copy.id }));
    },
  };
}
