import { useEffect } from 'react';

export function useDiscogsRetry(retryAt: number | undefined, retry: () => void, active = true) {
  useEffect(() => {
    if (!active || retryAt === undefined) return undefined;
    const timer = window.setTimeout(
      retry,
      Math.min(2_147_483_647, Math.max(0, retryAt - Date.now())),
    );
    return () => {
      window.clearTimeout(timer);
    };
  }, [active, retry, retryAt]);
}
