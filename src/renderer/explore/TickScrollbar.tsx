import { useCallback, useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';

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
        if (event.ctrlKey || event.deltaY === 0) return;
        const { deltaMode, deltaY } = event;
        let distance = deltaY;
        if (deltaMode === WheelEvent.DOM_DELTA_LINE) distance *= 16;
        if (deltaMode === WheelEvent.DOM_DELTA_PAGE) distance *= element.clientHeight;
        element.scrollBy(0, distance);
        event.preventDefault();
      };
      track.addEventListener('wheel', scroll, { passive: false });
      return () => track.removeEventListener('wheel', scroll);
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
      onChange={(event) => {
        const position = event.currentTarget.valueAsNumber;
        viewport.current?.scrollTo(0, position);
        setRange((previous) => ({ ...previous, position }));
      }}
    />
  );
}
