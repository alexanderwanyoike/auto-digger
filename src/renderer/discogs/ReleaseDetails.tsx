import { useState } from 'react';
import { Disc3 } from 'lucide-react';
import type { DiscogsRelease } from '../../shared/discogs';

export function ReleaseDetails({ release }: { release: DiscogsRelease }) {
  const [artworkFailed, setArtworkFailed] = useState(false);
  return (
    <article className="release-details" aria-labelledby="release-title">
      <div className="release-overview">
        {release.artworkUrl && !artworkFailed ? (
          <img
            className="release-artwork"
            onError={() => {
              setArtworkFailed(true);
            }}
            src={release.artworkUrl}
            alt={`${release.title} record sleeve`}
          />
        ) : (
          <div className="release-artwork missing-artwork">
            <Disc3 size={50} strokeWidth={1} aria-hidden="true" />
            <span>No artwork available</span>
          </div>
        )}
        <div className="release-credits">
          <span className="eyebrow blue-text">DISCOGS / r{release.id}</span>
          <h2 id="release-title">{release.title}</h2>
          <p className="release-artist">{release.artists.join(', ') || 'Artist not listed'}</p>
          <p>
            {release.year ?? 'Year not listed'} · {release.country ?? 'Country not listed'}
          </p>
          <div className="release-labels">
            {release.labels.length ? (
              release.labels.map((label) => (
                <p key={`${label.name}-${label.catalogueNumber}`}>
                  <strong>{label.name}</strong>
                  <span>{label.catalogueNumber || 'Catalogue number not listed'}</span>
                </p>
              ))
            ) : (
              <p>Label not listed</p>
            )}
          </div>
        </div>
      </div>
      <dl className="release-facts">
        <div>
          <dt>Genre</dt>
          <dd>{release.genres.join(', ') || 'Not listed'}</dd>
        </div>
        <div>
          <dt>Style</dt>
          <dd>{release.styles.join(', ') || 'Not listed'}</dd>
        </div>
        <div>
          <dt>Format</dt>
          <dd>{release.formats.join(' / ') || 'Not listed'}</dd>
        </div>
      </dl>
      <div className="tracklist-heading">
        <h3>Tracklist</h3>
        <span>{release.tracks.length} entries</span>
      </div>
      {release.tracks.length ? (
        <ol className="tracklist">
          {release.tracks.map((track) => (
            <li key={`${track.position}-${track.title}`}>
              <span className="track-position">{track.position || '•'}</span>
              <span>{track.title}</span>
              <span className="track-duration">{track.duration || 'Not listed'}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="metadata-empty">No tracklist is available for this release.</p>
      )}
      <p className="video-note">
        {release.videos.length} YouTube {release.videos.length === 1 ? 'video' : 'videos'} attached
        · Videos are provided by Discogs contributors.
      </p>
    </article>
  );
}
