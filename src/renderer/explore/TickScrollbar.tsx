import { useCallback, useLayoutEffect, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import { scrollWithKeys, scrollWithWheel } from './scroll-input';

const tickOffsets = Array.from({ length: 25 }, (_, index) => index - 12);

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
    <div
      className="explore-scrollbar-frame"
      onPointerMove={(event) => {
        if (event.pointerType === 'touch') return;
        const track = event.currentTarget.getBoundingClientRect();
        const offset = event.clientY - (track.top + track.height / 2);
        event.currentTarget.style.setProperty('--pointer-offset', `${offset.toString()}px`);
      }}
      onPointerLeave={(event) => {
        event.currentTarget.style.removeProperty('--pointer-offset');
      }}
    >
      <div className="explore-scrollbar-ticks" aria-hidden="true">
        {tickOffsets.map((offset) => (
          <span
            key={offset}
            className="explore-scrollbar-tick"
            style={{ '--tick-offset': offset } as CSSProperties}
          />
        ))}
      </div>
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
          scrollWithKeys(event, viewport.current);
        }}
        onChange={(event) => {
          const position = event.currentTarget.valueAsNumber;
          viewport.current?.scrollTo(0, position);
          setRange((previous) => ({ ...previous, position }));
        }}
      />
    </div>
  );
}
