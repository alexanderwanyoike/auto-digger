export function createDiscogsRequestQueue() {
  const foreground: (() => Promise<void>)[] = [];
  const background: (() => Promise<void>)[] = [];
  let running = false;

  async function drain() {
    const task = foreground.shift() ?? background.shift();
    if (!task) {
      running = false;
      return;
    }
    await task();
    await drain();
  }

  return <T>(operation: () => Promise<T>, defer = false) =>
    new Promise<T>((resolve, reject) => {
      const queue = defer ? background : foreground;
      queue.push(async () => {
        try {
          resolve(await operation());
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
      if (running) return;
      running = true;
      drain().catch(reject);
    });
}
