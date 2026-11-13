import { useEffect, useRef } from 'react';

export function useScrollContinuation(load: (() => void) | undefined) {
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = sentinel.current;
    if (!element || !load) return undefined;
    let active = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!active || !entry?.isIntersecting) return;
        active = false;
        observer.disconnect();
        load();
      },
      { rootMargin: '200px 0px' },
    );
    observer.observe(element);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [load]);

  return sentinel;
}
