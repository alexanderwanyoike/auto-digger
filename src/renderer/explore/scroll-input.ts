import type { KeyboardEvent, WheelEvent as ReactWheelEvent } from 'react';

export function scrollWithKeys(event: KeyboardEvent<HTMLElement>, viewport: HTMLElement | null) {
  if (!viewport || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (['ArrowDown', 'PageDown', 'End'].includes(event.key))
    viewport.dispatchEvent(new Event('scroll-forward'));
  switch (event.key) {
    case 'Home':
      viewport.scrollTo(0, 0);
      break;
    case 'End':
      viewport.scrollTo(0, viewport.scrollHeight);
      break;
    case 'ArrowDown':
      viewport.scrollBy(0, 40);
      break;
    case 'ArrowUp':
      viewport.scrollBy(0, -40);
      break;
    case 'PageDown':
      viewport.scrollBy(0, viewport.clientHeight);
      break;
    case 'PageUp':
      viewport.scrollBy(0, -viewport.clientHeight);
      break;
    default:
      return;
  }
  event.preventDefault();
}

export function scrollWithWheel(event: WheelEvent | ReactWheelEvent, viewport: HTMLElement | null) {
  if (!viewport || event.ctrlKey) return false;
  const { deltaMode, deltaY } = event;
  if (deltaY === 0) return false;
  if (deltaY > 0) viewport.dispatchEvent(new Event('scroll-forward'));
  let distance = deltaY;
  if (deltaMode === WheelEvent.DOM_DELTA_LINE) distance *= 16;
  if (deltaMode === WheelEvent.DOM_DELTA_PAGE) distance *= viewport.clientHeight;
  const { scrollTop } = viewport;
  viewport.scrollBy(0, distance);
  return viewport.scrollTop !== scrollTop;
}
