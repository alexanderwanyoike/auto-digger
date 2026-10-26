import { useEffect, useState } from 'react';

export function SoulseekSettings() {
  const bridge = window.soulseek;
  const [url, setUrl] = useState('http://127.0.0.1:5030');
  const [directory, setDirectory] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [configured, setConfigured] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(Boolean(bridge));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    let active = true;
    bridge
      ?.settings()
      .then((result) => {
        if (!active) return;
        if (result.ok && result.value) {
          setUrl(result.value.url);
          setDirectory(result.value.directory);
          setConfigured(result.value.configured);
        } else if (!result.ok) {
          setError(result.error.message);
          setLoadFailed(true);
        }
        setBusy(false);
      })
      .catch(() => {
        if (active) {
          setError('slskd settings could not be loaded. Please retry.');
          setLoadFailed(true);
          setBusy(false);
        }
      });
    return () => {
      active = false;
    };
  }, [bridge]);
  async function configure() {
    if (!bridge) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const result = await bridge.configure({ url, directory, apiKey });
      if (result.ok) {
        setConfigured(true);
        setLoadFailed(false);
        setApiKey('');
        setSaved(true);
      } else setError(result.error.message);
    } catch {
      setError('slskd settings could not be saved. Please retry.');
    } finally {
      setBusy(false);
    }
  }
  async function disconnect() {
    if (!bridge) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const result = await bridge.disconnect();
      if (result.ok) {
        setConfigured(false);
        setLoadFailed(false);
        setApiKey('');
      } else setError(result.error.message);
    } catch {
      setError('The slskd connection could not be forgotten. Please retry.');
    } finally {
      setBusy(false);
    }
  }
  const submitLabel = configured ? 'Save slskd connection' : 'Connect slskd';
  return (
    <section className="settings-card soulseek-settings" aria-label="Soulseek settings">
      <h2>Soulseek</h2>
      <p>
        Use your own slskd instance to find audio while digging. Completed files are copied into
        your Auto Digger downloads using the organisation above.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          configure().catch(() => undefined);
        }}
      >
        <label htmlFor="slskd-url">
          slskd URL
          <input
            id="slskd-url"
            type="url"
            required
            value={url}
            disabled={busy || !bridge}
            onChange={(event) => {
              setUrl(event.target.value);
            }}
          />
        </label>
        <label htmlFor="slskd-api-key">
          slskd API key
          <input
            id="slskd-api-key"
            type="password"
            autoComplete="off"
            placeholder={configured ? 'Leave blank to keep the saved key' : 'ReadWrite API key'}
            value={apiKey}
            required={!configured}
            disabled={busy || !bridge}
            onChange={(event) => {
              setApiKey(event.target.value);
            }}
          />
        </label>
        <label htmlFor="slskd-directory">
          slskd completed-downloads folder
          <input
            id="slskd-directory"
            required
            placeholder="Folder visible on this computer"
            value={directory}
            disabled={busy || !bridge}
            onChange={(event) => {
              setDirectory(event.target.value);
            }}
          />
        </label>
        <p>
          For Docker, choose the host folder mapped to slskd’s downloads directory. This is separate
          from your Auto Digger library.
        </p>
        <button className="secondary-button" type="submit" disabled={busy || !bridge}>
          {busy ? 'Checking…' : submitLabel}
        </button>
        {(configured || loadFailed) && (
          <button
            className="secondary-button"
            type="button"
            disabled={busy}
            onClick={() => {
              disconnect().catch(() => undefined);
            }}
          >
            Forget slskd connection
          </button>
        )}
      </form>
      {saved && <p role="status">slskd connection saved.</p>}
      {configured && (
        <p>
          Your API key is remembered using operating system encryption. Soulseek sign-in and sharing
          are managed in slskd.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <details>
        <summary>Set up slskd</summary>
        <ol>
          <li>
            Run slskd separately and sign into Soulseek in its configuration. Its web login is a
            separate account.
          </li>
          <li>Share your chosen music folder and let slskd index it.</li>
          <li>Create a ReadWrite API key in slskd, then enter its URL and key here.</li>
          <li>
            Enter the completed-downloads folder visible on this computer. With Docker, use the host
            side of the downloads volume mapping.
          </li>
          <li>
            Choose your Auto Digger folder layout above. Open a record, choose Soulseek under Audio
            sources, then select the track to find.
          </li>
        </ol>
      </details>
    </section>
  );
}
