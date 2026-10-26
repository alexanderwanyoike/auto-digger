import type { DemoTrack } from './demoData';
import type { DemoCopy } from './useDemoCopies';

export function SavedCopies({
  track,
  copies,
  preferred,
  onPrefer,
}: {
  track: DemoTrack;
  copies: DemoCopy[];
  preferred: string | undefined;
  onPrefer: (copy: DemoCopy) => void;
}) {
  const saved = copies.filter((copy) => copy.candidate.trackId === track.id);
  const selected = saved.find((copy) => copy.id === preferred);
  return (
    <section className="prototype-saved">
      <header>
        <h4>Saved copies</h4>
        <span>
          {selected ? `Preferred: ${selected.candidate.provider}` : 'No saved copy for this track.'}
        </span>
      </header>
      <ul aria-label={`Saved copies for ${track.title}`}>
        {saved.map((copy) => (
          <li key={copy.id}>
            <div>
              <strong>{copy.candidate.provider}</strong>
              <span>
                {copy.candidate.quality} · {copy.candidate.owner}
              </span>
            </div>
            <button
              type="button"
              className="secondary-button"
              disabled={copy.id === preferred}
              onClick={() => onPrefer(copy)}
            >
              Use {copy.candidate.provider} copy
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
