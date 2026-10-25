import { useEffect, useState } from 'react';
import type { UpdateState, UpdateResult } from '../../shared/updates';

export function UpdateNotice() {
  const bridge = window.updates;
  const [state, setState] = useState<UpdateState>({ stage: 'disabled' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!bridge) return undefined;
    let active = true;
    const refresh = () => {
      bridge
        .status()
        .then((result) => {
          if (active && result.ok) setState(result.value);
        })
        .catch(() => undefined);
    };
    refresh();
    const timer = window.setInterval(refresh, 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [bridge]);
  async function run(operation: () => Promise<UpdateResult<UpdateState>>) {
    setBusy(true);
    setError(null);
    try {
      const result = await operation();
      if (result.ok) setState(result.value);
      else {
        setError(result.error);
        const current = await bridge?.status();
        if (current?.ok) setState(current.value);
      }
    } catch {
      setError('The update could not finish. Please retry.');
    } finally {
      setBusy(false);
    }
  }
  if (!bridge || state.stage === 'disabled') return <span>Built for the long way round.</span>;
  if (state.stage === 'checking') return <span role="status">Checking for updates...</span>;
  if (state.stage === 'downloading')
    return <span role="status">Downloading update · {state.percent}%</span>;
  let label = 'Check for updates';
  let operation = bridge.check;
  if (state.stage === 'available') {
    label = `Update available · v${state.version}`;
    operation = bridge.download;
  }
  if (state.stage === 'ready') {
    label = `Restart to update · v${state.version}`;
    operation = bridge.install;
  }
  if (error) label = 'Update failed · Retry';
  return (
    <button
      type="button"
      className="update-notice"
      disabled={busy}
      title={error ?? undefined}
      onClick={() => {
        run(operation).catch(() => undefined);
      }}
    >
      {label}
    </button>
  );
}
