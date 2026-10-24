import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { DiscogsRelease } from '../../shared/discogs';
import { storePlatforms } from '../../shared/storeLinks';

const labels = {
  discogs: 'Discogs sellers',
  beatport: 'Search Beatport',
  traxsource: 'Search Traxsource',
  bandcamp: 'Search Bandcamp',
};
export function StoreLinks({ release }: { release: DiscogsRelease }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="store-links" aria-label="Find this record">
      {storePlatforms.map((platform) => (
        <button
          key={platform}
          type="button"
          className="secondary-button"
          disabled={!window.storeLinks}
          onClick={() => {
            setError(null);
            window.storeLinks
              ?.open(platform, release)
              .then((result) => {
                if (!result.ok) setError(result.error.message);
              })
              .catch(() => {
                setError('Your browser could not open this store. Please retry.');
              });
          }}
        >
          {labels[platform]} <ExternalLink size={11} aria-hidden="true" />
        </button>
      ))}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
