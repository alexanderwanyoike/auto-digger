import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export const prototypeLayouts = ['A', 'B', 'C'] as const;
export type PrototypeLayout = (typeof prototypeLayouts)[number];
function readLayout(): PrototypeLayout {
  const selected = new URLSearchParams(window.location.search).get('variant');
  return prototypeLayouts.find((layout) => layout === selected) ?? 'A';
}
export function usePrototypeLayout() {
  const [variant, setVariant] = useState(readLayout);
  const cycle = useCallback(
    (direction: number) => {
      const index =
        (prototypeLayouts.indexOf(variant) + direction + prototypeLayouts.length) %
        prototypeLayouts.length;
      const next = prototypeLayouts[index] ?? 'A';
      const url = new URL(window.location.href);
      url.searchParams.set('variant', next);
      window.history.replaceState(null, '', url);
      setVariant(next);
    },
    [variant],
  );
  useEffect(() => {
    const onHistory = () => {
      setVariant(readLayout());
    };
    window.addEventListener('popstate', onHistory);
    return () => {
      window.removeEventListener('popstate', onHistory);
    };
  }, []);
  return { variant, cycle };
}
export function PrototypeSwitcher({
  variant,
  cycle,
}: {
  variant: PrototypeLayout;
  cycle: (direction: number) => void;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const element = event.target;
      if (
        element instanceof HTMLElement &&
        (element.closest('input, textarea, select, [contenteditable]') || element.isContentEditable)
      )
        return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        cycle(event.key === 'ArrowLeft' ? -1 : 1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [cycle]);
  const names = { A: 'Track ledger', B: 'Source inspector', C: 'Release shelves' };
  return (
    <nav className="prototype-switcher" aria-label="Prototype layout">
      <button
        type="button"
        aria-label="Previous layout"
        onClick={() => {
          cycle(-1);
        }}
      >
        <ArrowLeft size={16} />
      </button>
      <div>
        <small>COMPARE LAYOUTS</small>
        <strong>
          {variant} · {names[variant]}
        </strong>
      </div>
      <button
        type="button"
        aria-label="Next layout"
        onClick={() => {
          cycle(1);
        }}
      >
        <ArrowRight size={16} />
      </button>
    </nav>
  );
}
