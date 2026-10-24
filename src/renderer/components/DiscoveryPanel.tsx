import { ArrowUpRight, Shuffle } from 'lucide-react';

export function DiscoveryPanel() {
  return (
    <section className="discovery-panel" aria-labelledby="discovery-heading">
      <div className="section-topline">
        <span className="eyebrow">ON THE DECK</span>
        <span className="catalogue-number">AD / 001</span>
      </div>
      <div className="record-stage" aria-hidden="true">
        <div className="sleeve">
          <span className="sleeve-mark">
            auto
            <br />
            digger.
          </span>
          <span className="sleeve-caption">ROOM FOR THE UNEXPECTED</span>
          <span className="sleeve-edition">VOL. 01</span>
        </div>
        <div className="vinyl">
          <div className="record-label">
            <span>AD</span>
            <i />
            <small>33⅓ RPM</small>
          </div>
        </div>
        <div className="stage-caption">
          <span className="blue-dot" /> A NEW SESSION
        </div>
      </div>
      <div className="discovery-copy">
        <span className="eyebrow blue-text">A LITTLE CURIOSITY GOES A LONG WAY</span>
        <h2 id="discovery-heading">Your next find starts here.</h2>
        <p>
          A label you love. A year you keep coming back to.
          <br className="desktop-break" /> Follow a thread and see where the records take you.
        </p>
        <span className="availability">
          <span className="status-dot" /> Waiting for Discogs
        </span>
      </div>
      <div className="discovery-footnote">
        <Shuffle size={14} aria-hidden="true" />
        <span>Random EPs. Within your orbit.</span>
        <ArrowUpRight size={14} aria-hidden="true" />
      </div>
    </section>
  );
}
