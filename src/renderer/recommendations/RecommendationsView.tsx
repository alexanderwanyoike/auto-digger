import { useId } from 'react';
import { ArrowLeft, ArrowUpRight, Play, RefreshCw } from 'lucide-react';
import type { useRecommendations } from './use-recommendations';
import '../styles/recommendations.css';

export function RecommendationsView({ model }: { model: ReturnType<typeof useRecommendations> }) {
  const fromId = useId();
  const toId = useId();
  return (
    <section
      className="recommendations-view release-workspace"
      aria-label="Recommendations"
      aria-busy={model.busy}
    >
      <header className="recommendations-heading">
        <button type="button" className="source-folder" onClick={model.close}>
          <ArrowLeft size={12} aria-hidden="true" /> Back to {model.origin?.title ?? 'release'}
        </button>
        <span className="eyebrow">COSINE CLUB</span>
        <h2>Similar to {model.seed?.title}</h2>
        <p>{model.data?.seed.artist ?? model.seed?.release.artists.join(', ')}</p>
      </header>
      <details className="recommendation-refine">
        <summary>Refine recommendations</summary>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            model.refresh();
          }}
        >
          <label htmlFor={fromId}>
            From year
            <input
              id={fromId}
              type="number"
              min="1900"
              max="2030"
              value={model.fromYear}
              onChange={(event) => {
                model.setFromYear(event.target.value);
              }}
            />
          </label>
          <label htmlFor={toId}>
            To year
            <input
              id={toId}
              type="number"
              min="1900"
              max="2030"
              value={model.toYear}
              onChange={(event) => {
                model.setToYear(event.target.value);
              }}
            />
          </label>
          <button
            type="submit"
            className="secondary-button"
            disabled={model.busy || Boolean(model.acting)}
          >
            <RefreshCw size={12} aria-hidden="true" /> Refresh recommendations
          </button>
        </form>
      </details>
      {model.busy && (
        <p role="status" className="recommendations-notice">
          Finding similar tracks…
        </p>
      )}
      {model.error && (
        <p role="alert" className="recommendations-notice">
          {model.error}
        </p>
      )}
      {model.data && (
        <>
          <div className="recommendations-count">
            <span>{model.data.tracks.length} recommendations</span>
            <span>Check the mix before saving.</span>
          </div>
          <ol className="recommendation-list">
            {model.data.tracks.map((item) => (
              <li key={item.id}>
                <div className="recommendation-credit">
                  <strong>{item.title}</strong>
                  <span>{item.artist}</span>
                  {item.releaseId === null && <small>No linked release</small>}
                </div>
                <div className="recommendation-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    aria-label={`Preview ${item.title}`}
                    title={
                      item.youtubeUrl && item.releaseId
                        ? 'Preview without saving'
                        : 'Preview requires a YouTube upload and linked release'
                    }
                    disabled={
                      model.busy || Boolean(model.acting) || !item.youtubeUrl || !item.releaseId
                    }
                    onClick={() => {
                      model.preview(item);
                    }}
                  >
                    <Play size={13} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    aria-label={`Open release for ${item.title}`}
                    disabled={model.busy || Boolean(model.acting) || !item.releaseId}
                    onClick={() => {
                      model.open(item);
                    }}
                  >
                    Open release <ArrowUpRight size={12} aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
          {!model.data.tracks.length && (
            <p className="recommendations-notice">
              No similar tracks matched. Try a broader year range or another upload.
            </p>
          )}
        </>
      )}
    </section>
  );
}
