import { useEffect, useState } from 'react';
import type { CatalogueResult } from '../../shared/catalogue';
import type { ResearchAccess } from '../../shared/researchAccess';

export function ResearchSettings() {
  const bridge = window.researchAccess;
  const [access, setAccess] = useState<ResearchAccess | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState('toml');
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    let active = true;
    bridge
      ?.status()
      .then((result) => {
        if (!active) return;
        if (result.ok) setAccess(result.value);
        else setError(result.error.message);
      })
      .catch(() => {
        if (active) setError('Research settings could not be loaded. Please reopen Settings.');
      });
    return () => {
      active = false;
    };
  }, [bridge]);
  async function change(operation: () => Promise<CatalogueResult<ResearchAccess>>) {
    setBusy(true);
    setError(null);
    try {
      const result = await operation();
      if (result.ok) setAccess(result.value);
      else setError(result.error.message);
    } catch {
      setError('Research access could not be changed. Please retry.');
    } finally {
      setBusy(false);
    }
  }
  async function saveExtension() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const result = await bridge?.saveExtension();
      if (result?.ok) setSaved(Boolean(result.value));
      else setError(result ? result.error.message : 'Open the desktop app to save the extension.');
    } catch {
      setError('The extension could not be saved. Please retry.');
    } finally {
      setBusy(false);
    }
  }
  const config = access?.configuration;
  const json = config ? JSON.stringify({ mcpServers: { auto_digger: config } }, null, 2) : '';
  const toml = config
    ? `[mcp_servers.auto_digger]\ncommand = ${JSON.stringify(config.command)}\nargs = ${JSON.stringify(config.args)}\nenv = { ELECTRON_RUN_AS_NODE = "1" }`
    : '';
  return (
    <div className="settings-card research-settings">
      <h2>
        AI mix research <span className="eyebrow">Experimental</span>
      </h2>
      <p>
        Let an MCP client research mixes and save releases, track picks and source notes to your
        crates. Connected clients can read and change crates while access is enabled.
      </p>
      <button
        className="secondary-button"
        type="button"
        disabled={!bridge || !access || busy}
        onClick={() => {
          if (bridge)
            change(() => (access?.enabled ? bridge.stop() : bridge.start())).catch(() => undefined);
        }}
      >
        {access?.enabled ? 'Disable research access' : 'Enable research access'}
      </button>
      {access?.enabled && (
        <>
          <p>
            Access ends when you disable it or close Auto Digger. Keep the app open and connect
            Discogs for searches. No separate Node.js installation is needed for MCP.
          </p>
          <h3>Claude Desktop</h3>
          <button
            className="secondary-button"
            type="button"
            disabled={busy}
            onClick={() => {
              saveExtension().catch(() => undefined);
            }}
          >
            Save Claude extension
          </button>
          {saved && <p role="status">Extension saved. Install it in Claude Desktop.</p>}
          <p>
            In Claude, open Settings → Desktop app. Choose Manage beside Extensions, then Advanced
            settings → Install Extension. Choose the saved file.
          </p>
          <details>
            <summary>Codex and other local clients</summary>
            <p>
              For Codex, choose STDIO and use the command, arguments and environment shown below.
              Claude Code can use the same local server.
            </p>
            <label htmlFor="research-config-format">
              Client format
              <select
                id="research-config-format"
                value={format}
                onChange={(event) => {
                  setFormat(event.target.value);
                }}
              >
                <option value="json">JSON client configuration</option>
                <option value="toml">Codex TOML configuration</option>
              </select>
            </label>
            <label htmlFor="research-config">
              MCP client configuration
              <textarea
                id="research-config"
                readOnly
                rows={7}
                spellCheck={false}
                value={format === 'json' ? json : toml}
              />
            </label>
          </details>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
