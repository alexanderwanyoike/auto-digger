import { useEffect, useState } from 'react';
import type { CatalogueResult } from '../../shared/catalogue';
import type { ResearchAccess } from '../../shared/researchAccess';

export function ResearchSettings() {
  const bridge = window.researchAccess;
  const [access, setAccess] = useState<ResearchAccess | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState('json');
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
            Discogs for searches. Node.js 22 or newer must be available to your MCP client.
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
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
