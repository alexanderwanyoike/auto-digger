import { Shuffle } from 'lucide-react';
import type { useDiscogs } from './useDiscogs';

export function DigControls({ session }: { session: ReturnType<typeof useDiscogs> }) {
  if (!session.filters) return null;
  return (
    <div className="dig-controls">
      <button
        type="button"
        className="primary-button"
        disabled={session.busy}
        onClick={() => {
          session.dig().catch(() => undefined);
        }}
      >
        <Shuffle size={14} aria-hidden="true" />
        {session.digging ? 'Dig again' : 'Dig a random EP'}
      </button>
      <button
        type="button"
        className="secondary-button"
        disabled={session.busy}
        onClick={() => {
          session.dig(true).catch(() => undefined);
        }}
      >
        Reset digging
      </button>
      {session.digging && (
        <p role="status">
          {session.digging.seen} found · {session.digging.total} accessible matches
          {session.digging.limited && <span> · Limited to Discogs’ first 10,000 results.</span>}
        </p>
      )}
      <p>Uses the last applied search filters.</p>
    </div>
  );
}
