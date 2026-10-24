import { useState } from 'react';
import { Radio } from 'lucide-react';
import type { CatalogueBridge } from '../shared/catalogue';
import { CratesPage } from './sections/CratesPage';
import { DownloadsPage } from './sections/DownloadsPage';
import { SettingsPage } from './sections/SettingsPage';
import type { CrateBridge } from '../shared/crate';
import { useCrate } from './crate/useCrate';
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
import type { AudioBridge } from '../shared/audio';
import { useAudioLibrary } from './audio/useAudioLibrary';
import appIcon from '../../resources/icons/icon.svg';

export function App({
  discogs = window.discogs,
  crate: crateBridge = window.crate,
  audioLibrary: audioBridge = window.audioLibrary,
  catalogue = window.catalogue,
}: {
  discogs?: DiscogsBridge;
  crate?: CrateBridge;
  audioLibrary?: AudioBridge;
  catalogue?: CatalogueBridge;
}) {
  const [section, setSection] = useState('Digging desk');
  const audio = useAudioLibrary(audioBridge);
  const crate = useCrate(crateBridge, catalogue);
  const session = useDiscogs(discogs);
  const [connectionOpen, setConnectionOpen] = useState(false);
  const { appearance, selectAppearance, storageAvailable } = useAppearance();
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="wordmark">
          <img src={appIcon} width={28} height={28} alt="" aria-hidden="true" />
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
      <nav className="section-nav" aria-label="Main sections">
        {['Digging desk', 'Crates', 'Downloads', 'Settings'].map((item) => (
          <button
            type="button"
            key={item}
            aria-current={section === item ? 'page' : undefined}
            onClick={() => {
              setSection(item);
              if (item === 'Crates' && crate.catalogue.available)
                crate.reload().catch(() => undefined);
            }}
          >
            {item}
          </button>
        ))}
      </nav>
      <main>
        <div className="desk-toolbar">
          <div className="desk-title">
            <Radio size={17} aria-hidden="true" />
            <h1>{section}</h1>
          </div>
          <span className="toolbar-note">A fresh pair of ears.</span>
        </div>
        {section === 'Crates' && (
          <CratesPage
            disabled={session.busy}
            crate={crate}
            onOpen={(release) => {
              session.openSavedRelease(release);
              setSection('Digging desk');
            }}
          />
        )}
        {section === 'Downloads' && <DownloadsPage audio={audio} />}
        {section === 'Settings' && (
          <SettingsPage
            session={session}
            appearance={appearance}
            onAppearance={selectAppearance}
            onConnect={() => {
              session.clearError();
              setConnectionOpen(true);
            }}
          />
        )}
        {section === 'Digging desk' && (
          <div className="workspace">
            <FilterPanel session={session} />
            {session.account || session.release ? (
              <ReleaseWorkspace session={session} crate={crate} audio={audio} />
            ) : (
              <DiscoveryPanel />
            )}
            <CratePanel crate={crate} disabled={session.busy} onOpen={session.openSavedRelease} />
          </div>
        )}
      </main>
      {session.error && !connectionOpen && (
        <p role="alert" className="request-error">
          {session.error.message}
        </p>
      )}
      <PlaybackBar audio={audio} />
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
