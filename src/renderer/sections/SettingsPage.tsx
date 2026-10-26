import type { useDiscogs } from '../discogs/useDiscogs';
import type { Appearance } from '../theme/preferences';
import type { usePreferences } from './usePreferences';
import { ResearchSettings } from './ResearchSettings';
import { DownloadSettings } from './DownloadSettings';
import { AppearanceSettings } from './AppearanceSettings';
import { AboutSettings } from './AboutSettings';
import { SoulseekSettings } from './SoulseekSettings';

export function SettingsPage({
  session,
  appearance,
  onAppearance,
  onConnect,
  preferences,
}: {
  preferences: ReturnType<typeof usePreferences>;
  session: ReturnType<typeof useDiscogs>;
  appearance: Appearance;
  onAppearance: (appearance: Appearance) => void;
  onConnect: () => void;
}) {
  return (
    <section className="section-page settings-page" aria-label="App settings">
      <AppearanceSettings
        preferences={preferences}
        appearance={appearance}
        onAppearance={onAppearance}
      />
      <div className="settings-card">
        <h2>Discogs account</h2>
        <p>
          {session.account
            ? `Connected as ${session.account.username}.`
            : 'Connect a personal token to search Discogs.'}{' '}
          Your token is remembered using operating system encryption.
        </p>
        <button
          type="button"
          className="secondary-button"
          disabled={!session.available || session.busy}
          onClick={onConnect}
        >
          {session.account ? 'Manage account' : 'Connect Discogs'}
        </button>
      </div>
      <DownloadSettings preferences={preferences} />
      <SoulseekSettings />
      <ResearchSettings />
      <AboutSettings />
      {preferences.error && (
        <div className="crate-notice">
          <p role="alert">{preferences.error}</p>
          <button
            type="button"
            className="secondary-button"
            disabled={preferences.busy}
            onClick={() => {
              preferences.reload().catch(() => undefined);
            }}
          >
            Retry settings
          </button>
        </div>
      )}
    </section>
  );
}
