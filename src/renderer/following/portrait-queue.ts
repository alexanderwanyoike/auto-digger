export function createPortraitQueue() {
  let pending = Promise.resolve();

  return (load: () => Promise<void>) => {
    const next = pending.then(load);
    pending = next.catch(() => undefined);
    return next;
  };
}
