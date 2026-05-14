import { RepositoryEventsService } from "~~/services/RepositoryEventsService";
import {
  REPOSITORY_EVENT_WILDCARD,
  RepositoryEventTypes,
} from "~~/services/RepositoryEventTypes";
import type { RepositoryEvent } from "~~/services/RepositoryEventTypes";

// Tracks per-repository "in-flight" operation state so components
// can show spinners as soon as a *.started event arrives, without
// waiting for the HTTP response.
//
// Memory is bounded: only the latest in-flight op per repository is kept,
// and the entry is cleared on *.completed / *.failed.
export const RepositoryEventsStore = defineStore("RepositoryEventsStore", {
  state: () => ({
    inFlight: {} as Record<string, string | null>, // repository -> baseEventType (e.g. "git.pull")
    initialised: false,
  }),
  getters: {
    isBusy(state) {
      return (repository: string): boolean => !!state.inFlight[repository];
    },
    activeOperation(state) {
      return (repository: string): string | null =>
        state.inFlight[repository] || null;
    },
  },
  actions: {
    init() {
      if (this.initialised) {
        return;
      }
      this.initialised = true;
      RepositoryEventsService.on(REPOSITORY_EVENT_WILDCARD, (event) =>
        this.onEvent(event),
      );
    },
    onEvent(event: RepositoryEvent) {
      // Status snapshots are not lifecycle events, ignore here.
      if (event.eventType === RepositoryEventTypes.GIT_STATUS_CHANGED) {
        return;
      }
      if (event.eventType.endsWith(".started")) {
        this.inFlight[event.repository] = event.eventType.replace(
          /\.started$/,
          "",
        );
      } else if (
        event.eventType.endsWith(".completed") ||
        event.eventType.endsWith(".failed")
      ) {
        if (event.repository in this.inFlight) {
          delete this.inFlight[event.repository];
        }
      }
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(RepositoryEventsStore, import.meta.hot),
  );
}
