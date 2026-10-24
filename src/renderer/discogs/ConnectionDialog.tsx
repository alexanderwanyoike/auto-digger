import { useEffect, useRef, useState } from 'react';
import type { SubmitEvent } from 'react';
import { X } from 'lucide-react';
import type { useDiscogs } from './useDiscogs';

interface ConnectionDialogProps {
  session: ReturnType<typeof useDiscogs>;
  onClose: () => void;
}

export function ConnectionDialog({ session, onClose }: ConnectionDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [formError, setFormError] = useState<string | null>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
    };
  }, []);

  async function connect(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const token = new FormData(form).get('token');
    form.reset();
    const result = await session.connect(typeof token === 'string' ? token : '');
    if (result.ok) onClose();
  }
  async function reconnect() {
    setFormError(null);
    const result = await session.reconnect();
    if (result.ok && result.value) onClose();
    else if (result.ok)
      setFormError('No saved token was found. Enter your token once to remember this account.');
  }
  async function disconnect() {
    const result = await session.disconnect();
    if (result.ok) onClose();
  }
  const unexpected = () => {
    setFormError('Could not complete the request. Please try again.');
  };

  return (
    <dialog
      ref={dialog}
      className="connection-dialog"
      aria-labelledby="connection-heading"
      onCancel={(event) => {
        event.preventDefault();
        if (!session.busy) onClose();
      }}
    >
      <div className="dialog-heading">
        <h2 id="connection-heading">
          {session.account ? 'Your Discogs account' : 'Connect Discogs'}
        </h2>
        <button
          type="button"
          aria-label="Close connection dialog"
          className="icon-button"
          disabled={session.busy}
          onClick={onClose}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      {session.account ? (
        <div className="account-details">
          <p>
            Connected as <strong>{session.account.username}</strong>.
          </p>
          <p>This account reconnects automatically. Disconnect forgets the saved token.</p>
          <button
            type="button"
            disabled={session.busy}
            className="secondary-button"
            onClick={() => {
              disconnect().catch(unexpected);
            }}
          >
            Disconnect
          </button>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            connect(event).catch(unexpected);
          }}
        >
          <div className="saved-account-actions">
            <button
              type="button"
              className="secondary-button"
              disabled={session.busy}
              onClick={() => {
                reconnect().catch(unexpected);
              }}
            >
              Reconnect saved account
            </button>
            <button
              type="button"
              className="text-button"
              disabled={session.busy}
              onClick={() => {
                disconnect().catch(unexpected);
              }}
            >
              Forget saved token
            </button>
          </div>
          <p>Generate a personal token in Discogs under Settings → Developers.</p>
          <button
            type="button"
            className="text-button"
            disabled={session.busy}
            onClick={() => {
              session.openSettings().catch(unexpected);
            }}
          >
            Open Discogs settings ↗
          </button>
          <label htmlFor="discogs-token">
            Personal token
            <input
              id="discogs-token"
              name="token"
              type="password"
              autoComplete="off"
              spellCheck={false}
              required
              disabled={session.busy}
            />
          </label>
          <p className="token-note">
            Saved using this device’s credential encryption and restored on launch.
          </p>
          <button type="submit" className="primary-button" disabled={session.busy}>
            {session.busy ? 'Connecting…' : 'Connect account'}
          </button>
        </form>
      )}
      {(session.error !== null || formError !== null) && (
        <p role="alert" className="dialog-error">
          {session.error?.message ?? formError}
        </p>
      )}
    </dialog>
  );
}
