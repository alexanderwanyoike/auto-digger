import { useMemo, useState } from 'react';
import { Library, ListMusic, Radio, Settings as SettingsIcon } from 'lucide-react';
import { useRecommendations } from './recommendations/use-recommendations';
import { RecommendationsContext } from './recommendations/RecommendationsContext';
import { RecommendationsView } from './recommendations/RecommendationsView';
import { useSavedFilters } from './filters/use-saved-filters';
import { UpdateNotice } from './components/UpdateNotice';
import { usePreferences } from './sections/use-preferences';
import type { CatalogueBridge } from '../shared/catalogue';
import { CratesPage } from './sections/CratesPage';
import { DownloadsPage } from './sections/DownloadsPage';
import { SettingsPage } from './sections/SettingsPage';
import type { CrateBridge } from '../shared/crate';
import { useCrate } from './crate/use-crate';
import type { DiscogsBridge } from '../shared/discogs';
import { useDiscogs } from './discogs/use-discogs';
import { ConnectionDialog } from './discogs/ConnectionDialog';
import { ReleaseWorkspace } from './discogs/ReleaseWorkspace';
import { useAppearance } from './theme/use-appearance';
import { FilterPanel } from './components/FilterPanel';
import { DiscoveryPanel } from './components/DiscoveryPanel';
import { CratePanel } from './components/CratePanel';
import { PlaybackBar } from './components/PlaybackBar';
import type { AudioBridge } from '../shared/audio';
import { useAudioLibrary } from './audio/use-audio-library';
import appIcon from '../../resources/icons/icon.svg';

const sectionIcons = {
  'Digging desk': Radio,
  Crates: Library,
  Downloads: ListMusic,
  Settings: SettingsIcon,
};

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
  const [section, setSection] = useState<keyof typeof sectionIcons>('Digging desk');
  const SectionIcon = sectionIcons[section];
  const preferences = usePreferences(window.preferences);
  const filters = useSavedFilters(window.savedFilters);
  const audio = useAudioLibrary(audioBridge);
  const crate = useCrate(crateBridge, catalogue);
  const session = useDiscogs(discogs);
  const recommendations = useRecommendations(session.release, session.openSavedRelease, audio);
  const [connectionOpen, setConnectionOpen] = useState(false);
  const { appearance, selectAppearance, storageAvailable } = useAppearance();
  const recommendationActions = useMemo(
    () => ({ enabled: recommendations.configured, find: recommendations.find }),
    [recommendations.configured, recommendations.find],
  );
  let desk = <DiscoveryPanel />;
  if (session.account || session.release)
    desk = <ReleaseWorkspace session={session} crate={crate} audio={audio} />;
  if (recommendations.view === 'list') desk = <RecommendationsView model={recommendations} />;
  return (
    <RecommendationsContext.Provider value={recommendationActions}>
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
        </header>
        {!storageAvailable && (
          <p role="status" className="preference-notice">
            Appearance works for this session, but could not be saved on this device.
          </p>
        )}
        <nav className="section-nav" aria-label="Main sections">
          {(['Digging desk', 'Crates', 'Downloads'] as const).map((item) => (
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
          <button
            type="button"
            className="settings-nav"
            aria-label="Settings"
            title="Settings"
            aria-current={section === 'Settings' ? 'page' : undefined}
            onClick={() => {
              setSection('Settings');
            }}
          >
            <SettingsIcon size={17} aria-hidden="true" />
          </button>
        </nav>
        <main>
          <div className="desk-toolbar">
            <div className="desk-title">
              <SectionIcon size={17} aria-hidden="true" />
              <h1>{section}</h1>
            </div>
            {section === 'Digging desk' && recommendations.view === 'release' && (
              <button type="button" className="source-folder" onClick={recommendations.back}>
                Back to recommendations
              </button>
            )}
            {section === 'Digging desk' && recommendations.view !== 'release' && (
              <span className="toolbar-note">A fresh pair of ears.</span>
            )}
          </div>
          {section === 'Crates' && (
            <CratesPage
              disabled={session.busy}
              crate={crate}
              onOpen={(release) => {
                recommendations.dismiss();
                session.openSavedRelease(release);
                setSection('Digging desk');
              }}
            />
          )}
          {section === 'Downloads' && <DownloadsPage audio={audio} />}
          {section === 'Settings' && (
            <SettingsPage
              preferences={preferences}
              recommendations={recommendations}
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
              <FilterPanel session={session} filters={filters} />
              {desk}
              <CratePanel
                crate={crate}
                disabled={session.busy}
                onOpen={(release) => {
                  recommendations.dismiss();
                  session.openSavedRelease(release);
                }}
              />
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
          <UpdateNotice />
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
    </RecommendationsContext.Provider>
  );
}
