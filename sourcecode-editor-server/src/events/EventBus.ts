import { EventEmitter } from "events";
import { RepositoryEvent } from "./RepositoryEventTypes";

const REPOSITORY_EVENT = "repository_event";

// Single in-process emitter shared by the whole server process.
// Keeps the memory footprint flat (one listener for all WS clients,
// fan-out happens in WebSocketRoutes).
const emitter = new EventEmitter();
emitter.setMaxListeners(50);

export function EventBusEmit<T = unknown>(
  event: Omit<RepositoryEvent<T>, "ts"> & { ts?: number },
): void {
  const full: RepositoryEvent<T> = {
    repository: event.repository,
    eventType: event.eventType,
    eventDetail: event.eventDetail,
    ts: event.ts ?? Date.now(),
  };
  emitter.emit(REPOSITORY_EVENT, full);
}

export function EventBusSubscribe(
  handler: (event: RepositoryEvent) => void,
): () => void {
  emitter.on(REPOSITORY_EVENT, handler);
  return () => emitter.off(REPOSITORY_EVENT, handler);
}
