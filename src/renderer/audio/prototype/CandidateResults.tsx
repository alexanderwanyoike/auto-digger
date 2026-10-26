import { LockKeyhole } from 'lucide-react';
import { demoResults } from './demoData';
import type { DemoCandidate, DemoTrack } from './demoData';

export function CandidateResults({
  track,
  checked,
  scenario,
  showPrivate,
  onSave,
  unavailable = [],
}: {
  track: DemoTrack;
  checked: boolean;
  scenario: string;
  showPrivate: boolean;
  onSave?: (candidate: DemoCandidate) => void;
  unavailable?: string[];
}) {
  const results = demoResults(track, scenario);
  return (
    <section className="prototype-candidates" aria-label="Source candidates">
      {(['YouTube', 'Soulseek'] as const).map((provider) => {
        const result = results[provider];
        const matches = result.ok ? result.value : [];
        const privateCount = matches.filter((candidate) => candidate.access === 'private').length;
        const visible = matches.filter(
          (candidate) => showPrivate || candidate.access !== 'private',
        );
        return (
          <div className="prototype-provider" key={provider}>
            <header>
              <h4>{provider}</h4>
              <span>
                {checked && result.ok ? `${matches.length.toString()} candidates` : 'Not checked'}
              </span>
            </header>
            {!checked && <p>Check sources to see demo matches.</p>}
            {checked && !result.ok && <p role="status">{result.error.message}</p>}
            {checked && result.ok && matches.length === 0 && <p>No matches found on {provider}.</p>}
            {checked && result.ok && privateCount > 0 && privateCount === matches.length && (
              <p>Only private matches found on {provider}.</p>
            )}
            {checked && !showPrivate && privateCount > 0 && (
              <p>{privateCount.toString()} private match hidden</p>
            )}
            {checked &&
              visible.map((candidate) => (
                <article className="prototype-candidate" key={candidate.id}>
                  <div>
                    <strong>{candidate.filename}</strong>
                    <span>
                      {candidate.quality} · {candidate.duration} · {candidate.owner}
                    </span>
                    {candidate.access === 'private' && (
                      <span className="prototype-private">
                        <LockKeyhole size={12} aria-hidden="true" />
                        Private match from {candidate.owner}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={candidate.access === 'private' || unavailable.includes(candidate.id)}
                    aria-label={`Save demo copy from ${candidate.owner}`}
                    onClick={() => onSave?.(candidate)}
                  >
                    {candidate.access === 'private'
                      ? 'Private'
                      : unavailable.includes(candidate.id)
                        ? 'Already saved'
                        : 'Save demo copy'}
                  </button>
                </article>
              ))}
          </div>
        );
      })}
    </section>
  );
}
