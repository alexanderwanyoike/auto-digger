import { demoTracks } from './demoData';
import type { DemoTrack } from './demoData';
import type { DemoCopy } from './useDemoCopies';

export function DemoLibrary({
  copies,
  preferred,
  onSelect,
}: {
  copies: DemoCopy[];
  preferred: Record<string, string>;
  onSelect?: (track: DemoTrack) => void;
}) {
  return (
    <section className="prototype-library" aria-label="Demo library">
      <header>
        <h3>Your library</h3>
        <span>One row per release track</span>
      </header>
      <table>
        <thead>
          <tr>
            <th>Track</th>
            <th>Artist / release</th>
            <th>Saved audio</th>
          </tr>
        </thead>
        <tbody>
          {demoTracks.map((track) => {
            const saved = copies.filter((copy) => copy.candidate.trackId === track.id);
            const selected = saved.find((copy) => copy.id === preferred[track.id]);
            return (
              <tr key={track.id}>
                <td>
                  <button type="button" onClick={() => onSelect?.(track)}>
                    <span className="prototype-position">{track.position}</span>
                    {track.title}
                  </button>
                </td>
                <td>
                  {track.artist}
                  <span>{track.release}</span>
                </td>
                <td>
                  {selected
                    ? `${selected.candidate.provider} · ${saved.length.toString()} ${saved.length === 1 ? 'copy' : 'copies'}`
                    : 'Not saved'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
