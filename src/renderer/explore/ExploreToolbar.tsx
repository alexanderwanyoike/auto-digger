import { RefreshCw, Shuffle } from 'lucide-react';

export const exploreSections = ['Feed', 'Following', 'Catalogue'] as const;
export type ExploreSection = (typeof exploreSections)[number];

export function ExploreToolbar({
  section,
  busy,
  connected,
  refreshBusy,
  onSelect,
  onRefresh,
  onDiscover,
}: {
  section: ExploreSection;
  busy: boolean;
  connected: boolean;
  refreshBusy: boolean;
  onSelect: (section: ExploreSection) => void;
  onRefresh: () => void;
  onDiscover: (() => void) | undefined;
}) {
  return (
    <header className="explore-toolbar">
      <nav aria-label="Explore sections">
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
        {onDiscover && (
          <button type="button" className="secondary-button" onClick={onDiscover} disabled={busy}>
            <Shuffle size={14} aria-hidden="true" /> Discover unseen releases
          </button>
        )}
        {section === 'Feed' && connected && (
          <button
            type="button"
            className="secondary-button"
            onClick={onRefresh}
            disabled={busy || refreshBusy}
          >
            <RefreshCw size={14} aria-hidden="true" /> Refresh
          </button>
        )}
      </div>
    </header>
  );
}
