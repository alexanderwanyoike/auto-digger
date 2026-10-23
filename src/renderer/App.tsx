import { Disc3, Radio } from 'lucide-react';
import { FilterPanel } from './components/FilterPanel';
import { DiscoveryPanel } from './components/DiscoveryPanel';
import { CratePanel } from './components/CratePanel';
import { PlaybackBar } from './components/PlaybackBar';

export function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="wordmark">
          <Disc3 size={25} strokeWidth={1.5} aria-hidden="true" />
          <span>
            auto digger<span className="wordmark-period">.</span>
          </span>
        </div>
        <span className="header-caption">A place for good records.</span>
        <span className="connection-status">
          <span className="status-dot" /> Discogs not connected
        </span>
      </header>
      <main>
        <div className="desk-toolbar">
          <div className="desk-title">
            <Radio size={17} aria-hidden="true" />
            <h1>Digging desk</h1>
            <span className="preview-badge">PHASE 01</span>
          </div>
          <span className="toolbar-note">A fresh pair of ears.</span>
        </div>
        <div className="workspace">
          <FilterPanel />
          <DiscoveryPanel />
          <CratePanel />
        </div>
      </main>
      <PlaybackBar />
      <div className="status-bar">
        <span>
          <span className="blue-dot" /> FOUNDATION PREVIEW
        </span>
        <span>Built for the long way round.</span>
      </div>
    </div>
  );
}
