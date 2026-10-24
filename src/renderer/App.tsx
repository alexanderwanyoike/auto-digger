import { useState } from 'react';
import { Disc3, Radio } from 'lucide-react';
import type { DiscogsBridge } from '../shared/discogs';
import { useDiscogs } from './discogs/useDiscogs';
import { ConnectionDialog } from './discogs/ConnectionDialog';
import { ReleaseWorkspace } from './discogs/ReleaseWorkspace';
import { useAppearance } from './theme/useAppearance';
import { AppearanceControl } from './components/AppearanceControl';
import { FilterPanel } from './components/FilterPanel';
import { DiscoveryPanel } from './components/DiscoveryPanel';
import { CratePanel } from './components/CratePanel';
import { PlaybackBar } from './components/PlaybackBar';

export function App({ discogs = window.discogs }: { discogs?: DiscogsBridge }) {
  const session = useDiscogs(discogs);
  const [connectionOpen, setConnectionOpen] = useState(false);
  const { appearance, selectAppearance, storageAvailable } = useAppearance();
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
        <button
          type="button"
          className="connection-status"
          title={
            session.available
              ? 'Connect or disconnect your Discogs account'
              : 'Use the desktop app to connect to Discogs'
          }
          disabled={!session.available || session.busy}
          onClick={() => {
            session.clearError();
            setConnectionOpen(true);
          }}
        >
          <span className={session.account ? 'blue-dot' : 'status-dot'} />
          {session.account ? `Connected as ${session.account.username}` : 'Discogs not connected'}
        </button>
        <AppearanceControl appearance={appearance} onSelect={selectAppearance} />
      </header>
      {!storageAvailable && (
        <p role="status" className="preference-notice">
          Appearance works for this session, but could not be saved on this device.
        </p>
      )}
      <main>
        <div className="desk-toolbar">
          <div className="desk-title">
            <Radio size={17} aria-hidden="true" />
            <h1>Digging desk</h1>
            <span className="preview-badge">PHASE 05</span>
          </div>
          <span className="toolbar-note">A fresh pair of ears.</span>
        </div>
        <div className="workspace">
          <FilterPanel session={session} />
          {session.account ? <ReleaseWorkspace session={session} /> : <DiscoveryPanel />}
          <CratePanel />
        </div>
      </main>
      {session.error && !connectionOpen && (
        <p role="alert" className="request-error">
          {session.error.message}
        </p>
      )}
      <PlaybackBar release={session.release} />
      <div className="status-bar">
        <span>
          <span className="blue-dot" /> DISCOGS DISCOVERY
        </span>
        <span>Built for the long way round.</span>
      </div>
      {connectionOpen && (
        <ConnectionDialog
          session={session}
          onClose={() => {
            setConnectionOpen(false);
          }}
        />
      )}
    </div>
  );
}
