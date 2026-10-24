import type { useDiscogs } from '../discogs/useDiscogs';
import type { Appearance } from '../theme/preferences';
import { AppearanceControl } from '../components/AppearanceControl';

export function SettingsPage({
  session,
  appearance,
  onAppearance,
  onConnect,
}: {
  session: ReturnType<typeof useDiscogs>;
  appearance: Appearance;
  onAppearance: (appearance: Appearance) => void;
  onConnect: () => void;
}) {
  return (
    <section className="section-page settings-page" aria-label="App settings">
      <div className="section-intro">
        <span className="eyebrow">MAKE YOURSELF AT HOME.</span>
        <p>Your account and the way your desk feels.</p>
      </div>
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
      <div className="settings-card">
        <h2>Appearance</h2>
        <p>Follow your system, or choose a light or dark desk.</p>
        <AppearanceControl appearance={appearance} onSelect={onAppearance} />
      </div>
    </section>
  );
}
