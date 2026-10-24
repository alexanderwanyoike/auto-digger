import { useState } from 'react';
import { Disc3 } from 'lucide-react';

export function RecordArtwork({
  url,
  title,
  decorative = false,
  className = '',
}: {
  url: string | null;
  title: string;
  decorative?: boolean;
  className?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return (
    <div className={`record-cover ${className}`} aria-hidden={decorative || undefined}>
      {url && failedUrl !== url ? (
        <img
          src={url}
          alt={decorative ? '' : `${title} record sleeve`}
          loading={decorative ? 'lazy' : 'eager'}
          decoding="async"
          onError={() => {
            setFailedUrl(url);
          }}
        />
      ) : (
        <div className="cover-placeholder">
          <Disc3 size={36} strokeWidth={1} aria-hidden="true" />
          {!decorative && <span>No artwork available</span>}
        </div>
      )}
    </div>
  );
}
