import { Play } from 'lucide-react';
import type { SearchPage } from '../../shared/search';
import { RecordArtwork } from '../components/RecordArtwork';

export function ReleaseMatchList({
  releases,
  disabled,
  onOpen,
  onPreview,
  previewBusy,
}: {
  releases: SearchPage['releases'];
  disabled: boolean;
  onPreview?: ((id: number) => void) | undefined;
  previewBusy?: boolean | undefined;
  onOpen: (id: number) => void;
}) {
  return (
    <ul>
      {releases.map((release) => (
        <li key={release.id} className={onPreview ? 'sleeve-with-preview' : undefined}>
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
          {onPreview && (
            <button
              type="button"
              className="sleeve-play"
              aria-label={`Play ${release.title}`}
              disabled={disabled || previewBusy}
              onClick={() => {
                onPreview(release.id);
              }}
            >
              <Play size={16} fill="currentColor" aria-hidden="true" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
