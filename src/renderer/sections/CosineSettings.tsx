import { useState } from 'react';
import type { useRecommendations } from '../recommendations/use-recommendations';

export function CosineSettings({ model }: { model: ReturnType<typeof useRecommendations> }) {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  async function change(forget: boolean) {
    if (!model.bridge) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const result = await (forget ? model.bridge.forget() : model.bridge.saveKey(key));
      if (result.ok) {
        model.configure(result.value.configured);
        setKey('');
        setSaved(!forget);
      } else setError(result.error.message);
    } catch {
      setError('Cosine settings could not be saved. Please retry.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="settings-card cosine-settings" aria-label="Cosine Club settings">
      <h2>Cosine Club</h2>
      <p>
        Find similar tracks from a YouTube upload while digging. Your key is remembered using
        operating system encryption.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          change(false).catch(() => undefined);
        }}
      >
        <label htmlFor="cosine-key">
          Cosine Club API key
          <input
            id="cosine-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={key}
            required
            disabled={busy || !model.bridge}
            onChange={(event) => {
              setKey(event.target.value);
            }}
            placeholder={
              model.configured
                ? 'Enter a new key to replace the saved key'
                : 'Your Cosine Club API key'
            }
          />
        </label>
        <div className="cosine-setting-actions">
          <button type="submit" className="secondary-button" disabled={busy || !model.bridge}>
            {busy ? 'Saving…' : 'Save Cosine key'}
          </button>
          {(model.configured || model.connectionError) && (
            <button
              type="button"
              className="source-folder"
              disabled={busy}
              onClick={() => {
                change(true).catch(() => undefined);
              }}
            >
              Forget Cosine key
            </button>
          )}
        </div>
      </form>
      {saved && <p role="status">Cosine key saved.</p>}
      {model.configured && !saved && <p role="status">Cosine key saved on this device.</p>}
      {(error ?? model.connectionError) && <p role="alert">{error ?? model.connectionError}</p>}
      {!model.bridge && <p>Open the desktop app to connect Cosine Club.</p>}
    </section>
  );
}
