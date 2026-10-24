export function previewBody(
  body: ReadableStream<Uint8Array> | null,
  release: () => void,
): ReadableStream<Uint8Array> | null {
  if (!body) {
    release();
    return null;
  }
  const reader = body.getReader();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const chunk = await reader.read();
        if (chunk.done) {
          release();
          reader.releaseLock();
          controller.close();
        } else controller.enqueue(chunk.value);
      } catch (error) {
        release();
        reader.releaseLock();
        controller.error(error);
      }
    },
    async cancel(reason: unknown) {
      try {
        await reader.cancel(reason);
      } finally {
        release();
        reader.releaseLock();
      }
    },
  });
}
