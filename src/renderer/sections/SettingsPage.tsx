import type { useDiscogs } from '../discogs/use-discogs';
import type { Appearance } from '../theme/preferences';
import type { usePreferences } from './use-preferences';
import { ResearchSettings } from './ResearchSettings';
import { DownloadSettings } from './DownloadSettings';
import { AppearanceSettings } from './AppearanceSettings';
import { AboutSettings } from './AboutSettings';
import { SoulseekSettings } from './SoulseekSettings';
import { ApiFeasibilityPrototype } from './ApiFeasibilityPrototype';
import type {
  ApiProbeItem,
  ApiRecommendationRelease,
} from '../../shared/api-feasibility-prototype';

export function SettingsPage({
  session,
  appearance,
  onAppearance,
  onConnect,
  preferences,
  hidden = false,
  onOpenRecommendation,
}: {
  preferences: ReturnType<typeof usePreferences>;
  session: ReturnType<typeof useDiscogs>;
  appearance: Appearance;
  onAppearance: (appearance: Appearance) => void;
  onConnect: () => void;
  hidden?: boolean;
  onOpenRecommendation: (value: ApiRecommendationRelease, item: ApiProbeItem) => void;
}) {
  return (
    <section className="section-page settings-page" aria-label="App settings" hidden={hidden}>
      {window.apiFeasibility && <ApiFeasibilityPrototype onOpenRelease={onOpenRecommendation} />}
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
