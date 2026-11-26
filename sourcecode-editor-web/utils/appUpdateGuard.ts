type Flusher = () => void | Promise<void>;

const flushers = new Set<Flusher>();

/** Register a callback that persists unsaved editor state; returns an unregister. */
export function registerUnsavedWorkFlusher(flusher: Flusher): () => void {
  flushers.add(flusher);
  return () => {
    flushers.delete(flusher);
  };
}

/**
 * Run every registered flusher in registration order. A rejection aborts the
 * flush and propagates, so the caller can veto a reload.
 */
export async function flushUnsavedWork(): Promise<void> {
  for (const flush of [...flushers]) {
    await flush();
  }
}
