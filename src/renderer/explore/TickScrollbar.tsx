import { useCallback, useLayoutEffect, useState } from 'react';
import type { KeyboardEvent, RefObject, WheelEvent as ReactWheelEvent } from 'react';

export function scrollWithPageKeys(
  event: KeyboardEvent<HTMLElement>,
  viewport: HTMLElement | null,
) {
  if (!viewport || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const { key } = event;
  if (key !== 'PageDown' && key !== 'PageUp') return;
  event.preventDefault();
  viewport.scrollBy(0, key === 'PageDown' ? viewport.clientHeight : -viewport.clientHeight);
}

export function scrollWithWheel(event: WheelEvent | ReactWheelEvent, viewport: HTMLElement | null) {
  if (!viewport || event.ctrlKey) return false;
  const { deltaMode, deltaY } = event;
  if (deltaY === 0) return false;
  let distance = deltaY;
  if (deltaMode === WheelEvent.DOM_DELTA_LINE) distance *= 16;
  if (deltaMode === WheelEvent.DOM_DELTA_PAGE) distance *= viewport.clientHeight;
  const { scrollTop } = viewport;
  viewport.scrollBy(0, distance);
  return viewport.scrollTop !== scrollTop;
}

export function TickScrollbar({
  viewport,
  content,
  label,
}: {
  viewport: RefObject<HTMLElement | null>;
  content: RefObject<HTMLElement | null>;
  label: string;
}) {
  const [range, setRange] = useState({ maximum: 0, position: 0 });

  useLayoutEffect(() => {
    const element = viewport.current;
    const contents = content.current;
    if (!element || !contents) return undefined;

    const update = () => {
      const maximum = Math.max(0, element.scrollHeight - element.clientHeight);
      const position = Math.max(0, Math.min(maximum, Math.round(element.scrollTop)));
      setRange((previous) =>
        previous.maximum === maximum && previous.position === position
          ? previous
          : { maximum, position },
      );
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    observer.observe(contents);
    element.addEventListener('scroll', update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      element.removeEventListener('scroll', update);
    };
  }, [viewport, content]);

  const connectTrack = useCallback(
    (track: HTMLInputElement | null) => {
      const element = viewport.current;
      if (!track || !element) return undefined;

      const scroll = (event: WheelEvent) => {
        if (scrollWithWheel(event, element)) event.preventDefault();
      };
      track.addEventListener('wheel', scroll, { passive: false });
      return () => {
        track.removeEventListener('wheel', scroll);
      };
    },
    [viewport],
  );

  if (range.maximum === 0) return null;

  return (
    <input
      ref={connectTrack}
      type="range"
      className="explore-scrollbar"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuetext={`${Math.round((range.position / range.maximum) * 100).toString()}%`}
      min={0}
      max={range.maximum}
      value={range.position}
      onKeyDown={(event) => {
        const element = viewport.current;
        if (!element || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        const { key } = event;
        if (key === 'Home' || key === 'End') {
          event.preventDefault();
          element.scrollTo(0, key === 'Home' ? 0 : element.scrollHeight);
        } else if (key === 'ArrowDown' || key === 'ArrowUp') {
          event.preventDefault();
          element.scrollBy(0, key === 'ArrowDown' ? 40 : -40);
        } else {
          scrollWithPageKeys(event, element);
        }
      }}
      onChange={(event) => {
        const position = event.currentTarget.valueAsNumber;
        viewport.current?.scrollTo(0, position);
        setRange((previous) => ({ ...previous, position }));
      }}
    />
  );
}
