import { RefreshCw, Shuffle } from 'lucide-react';

export const exploreSections = ['Feed', 'Following', 'Catalogue', 'History'] as const;
export type ExploreSection = (typeof exploreSections)[number];

export function ExploreToolbar({
  section,
  busy,
  refreshBusy,
  previewError,
  onSelect,
  onRefresh,
  onDiscover,
  onAllFollowed,
}: {
  section: ExploreSection;
  busy: boolean;
  refreshBusy: boolean;
  previewError: string | null;
  onSelect: (section: ExploreSection) => void;
  onRefresh: (() => void) | undefined;
  onDiscover: (() => void) | undefined;
  onAllFollowed: (() => void) | undefined;
}) {
  return (
    <div className="explore-toolbar">
      <nav className="section-switcher" aria-label="Explore sections">
        {exploreSections.map((item) => (
          <button
            type="button"
            key={item}
            aria-current={item === section ? 'page' : undefined}
            disabled={busy}
            onClick={() => {
              onSelect(item);
            }}
          >
            {item}
          </button>
        ))}
      </nav>
      <div className="explore-actions">
        {onAllFollowed && (
          <button type="button" className="explore-action" onClick={onAllFollowed} disabled={busy}>
            All followed
          </button>
        )}
        {onDiscover && (
          <button
            type="button"
            className="explore-action explore-action-discover"
            onClick={onDiscover}
            disabled={busy}
          >
            <Shuffle size={15} aria-hidden="true" />
            <span>Discover unseen releases</span>
          </button>
        )}
        {onRefresh && (
          <button
            type="button"
            className="explore-action"
            onClick={onRefresh}
            disabled={busy || refreshBusy}
          >
            <RefreshCw size={15} aria-hidden="true" />
            <span>Refresh</span>
          </button>
        )}
      </div>
      {previewError && (
        <p role="alert" className="explore-preview-error">
          {previewError}
        </p>
      )}
    </div>
  );
}
