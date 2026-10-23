import { Bookmark, Library } from 'lucide-react';

export function CratePanel() {
  return (
    <aside className="crate-panel" aria-labelledby="crate-heading">
      <div className="panel-heading">
        <h2 id="crate-heading">
          <Library size={16} aria-hidden="true" /> Your crate
        </h2>
        <span className="count-badge">0</span>
      </div>
      <p className="panel-description">The ones worth coming back to.</p>
      <div className="crate-empty">
        <div className="empty-sleeves" aria-hidden="true">
          <span />
          <span />
          <span>
            <Bookmark size={19} strokeWidth={1.3} />
          </span>
        </div>
        <h3>No records saved yet.</h3>
        <p>
          When something catches your ear,
          <br />
          keep the whole EP here.
        </p>
      </div>
      <div className="crate-footer">
        <span className="eyebrow">SAVE NOW. LISTEN LATER.</span>
        <p>Your saved crate comes in Phase 6.</p>
      </div>
    </aside>
  );
}
