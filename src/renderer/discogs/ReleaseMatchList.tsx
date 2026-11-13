import type { SearchPage } from '../../shared/search';
import { RecordArtwork } from '../components/RecordArtwork';

export function ReleaseMatchList({
  releases,
  disabled,
  onOpen,
}: {
  releases: SearchPage['releases'];
  disabled: boolean;
  onOpen: (id: number) => void;
}) {
  return (
    <ul>
      {releases.map((release) => (
        <li key={release.id}>
          <button
            type="button"
            className="search-result"
            disabled={disabled}
            onClick={() => {
              onOpen(release.id);
            }}
          >
            <RecordArtwork url={release.artworkUrl} title={release.title} decorative />
            <strong title={release.title}>{release.title}</strong>
            <span
              title={`${release.year || 'Year not listed'} · ${release.labels.join(', ') || 'Label not listed'}`}
            >
              {release.year || 'Year not listed'} ·{' '}
              {release.labels.join(', ') || 'Label not listed'}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
