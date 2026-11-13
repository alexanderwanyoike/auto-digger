import { useEffect } from 'react';
import type { RefObject } from 'react';

export function useRevealCatalogueYear(
  rail: RefObject<HTMLElement | null>,
  selected: number | null | undefined,
) {
  useEffect(() => {
    if (selected == null) return;
    const viewport = rail.current;
    const button = viewport?.querySelector('[aria-current="true"]');
    if (!viewport || !button) return;
    const visible = viewport.getBoundingClientRect();
    const target = button.getBoundingClientRect();
    if (target.top < visible.top) viewport.scrollBy(0, target.top - visible.top);
    if (target.bottom > visible.bottom) viewport.scrollBy(0, target.bottom - visible.bottom);
  }, [rail, selected]);
}
