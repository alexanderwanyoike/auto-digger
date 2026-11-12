import { useMemo, useState } from 'react';
import { Compass, Library, ListMusic, Radio, Settings as SettingsIcon } from 'lucide-react';
import { ExplorePage } from './explore/ExplorePage';
import { useStarterShelf } from './explore/use-starter-shelf';
import { FollowingContext } from './following/following-context';
import { useFollowing } from './following/use-following';
import { useRecommendations } from './recommendations/use-recommendations';
import { RecommendationsContext } from './recommendations/recommendations-context';
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
import { PreviewStatus } from './components/PreviewStatus';
import type { AudioBridge } from '../shared/audio';
import { useAudioLibrary } from './audio/use-audio-library';
import appIcon from '../../resources/icons/icon.svg';

const sectionIcons = {
  'Digging desk': Radio,
  Explore: Compass,
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
  const [section, setSection] = useState<keyof typeof sectionIcons>('Explore');
  const SectionIcon = sectionIcons[section];
  const preferences = usePreferences(window.preferences);
  const filters = useSavedFilters(window.savedFilters);
  const following = useFollowing(window.following);
  const audio = useAudioLibrary(audioBridge);
  const crate = useCrate(crateBridge, catalogue);
  const session = useDiscogs(discogs, filters.rememberPage);
  const starterShelf = useStarterShelf(discogs?.starterShelf, session.account);
  const recommendations = useRecommendations(session.release, session.openSavedRelease, audio);
  const [connectionOpen, setConnectionOpen] = useState(false);
  const { appearance, selectAppearance, storageAvailable } = useAppearance();
  const recommendationActions = useMemo(
    () => ({ enabled: recommendations.configured, find: recommendations.find }),
    [recommendations.configured, recommendations.find],
  );
  let desk = <DiscoveryPanel />;
  if (session.account || session.release)
    desk = (
      <RecommendationsContext.Provider value={recommendationActions}>
        <ReleaseWorkspace session={session} crate={crate} audio={audio} />
      </RecommendationsContext.Provider>
    );
  if (recommendations.view === 'list') desk = <RecommendationsView model={recommendations} />;
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="wordmark">
          <img src={appIcon} width={24} height={24} alt="" aria-hidden="true" />
          <span>
            auto digger<span className="wordmark-period">.</span>
          </span>
        </div>
        <nav className="section-nav" aria-label="Main sections">
          <div className="section-switcher">
            {(['Explore', 'Digging desk', 'Crates', 'Downloads'] as const).map((item) => {
              const Icon = sectionIcons[item];
              return (
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
                  <Icon size={14} aria-hidden="true" />
                  {item}
                </button>
              );
            })}
          </div>
          <button
            type="button"
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
          <span>
            {session.account ? `Connected as ${session.account.username}` : 'Discogs not connected'}
          </span>
        </button>
      </header>
      {!storageAvailable && (
        <p role="status" className="preference-notice">
          Appearance works for this session, but could not be saved on this device.
        </p>
      )}
      <main>
        {section === 'Digging desk' || section === 'Explore' ? (
          <h1 className="sr-only">{section}</h1>
        ) : (
          <div className="desk-toolbar">
            <div className="desk-title">
              <SectionIcon size={17} aria-hidden="true" />
              <h1>{section}</h1>
            </div>
          </div>
        )}
        {section === 'Digging desk' && recommendations.view === 'release' && (
          <div className="desk-toolbar">
            <button type="button" className="source-folder" onClick={recommendations.back}>
              Back to recommendations
            </button>
          </div>
        )}
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
        {section === 'Explore' && (
          <ExplorePage
            bridge={discogs}
            connected={Boolean(session.account)}
            starterShelf={starterShelf}
            following={following}
            crate={crate}
            audio={audio}
          />
        )}
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
            <FollowingContext.Provider value={following}>
              <FilterPanel session={session} filters={filters} />
              {desk}
            </FollowingContext.Provider>
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
      {following.error && !connectionOpen && (
        <p role="alert" className="request-error">
          {following.error}{' '}
          <button
            type="button"
            className="secondary-button"
            onClick={following.retry}
            disabled={following.busy}
          >
            Reload following
          </button>
        </p>
      )}
      <PlaybackBar audio={audio} />
      <div className="status-bar" role="region" aria-label="App status">
        <PreviewStatus audio={audio} />
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
  );
}
