import { useState } from 'react';
import type { ReactNode } from 'react';

export function SourceGroup({
  indexes,
  unmatched = false,
  renderSource,
}: {
  indexes: number[];
  unmatched?: boolean;
  renderSource: (index: number) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const first = unmatched ? undefined : indexes[0];
  const others = unmatched ? indexes : indexes.slice(1);
  return (
    <>
      {first !== undefined && renderSource(first)}
      {others.length > 0 && (
        <li className="source-alternatives">
          <details
            onToggle={(event) => {
              setOpen(event.currentTarget.open);
            }}
          >
            <summary>
              {others.length} {unmatched ? 'unmatched' : 'alternate'}{' '}
              {others.length === 1 ? 'upload' : 'uploads'}
            </summary>
            {open && <ol className="source-list">{others.map(renderSource)}</ol>}
          </details>
        </li>
      )}
    </>
  );
}
