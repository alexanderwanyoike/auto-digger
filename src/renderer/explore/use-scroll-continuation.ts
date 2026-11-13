import { useEffect, useRef } from 'react';

export function useScrollContinuation(load: (() => void) | undefined) {
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = sentinel.current;
    if (!element || !load) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        load();
      },
      { rootMargin: '200px 0px' },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [load]);

  return sentinel;
}
