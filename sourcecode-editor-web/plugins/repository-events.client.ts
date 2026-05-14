import { defineNuxtPlugin } from "#app";
import { RepositoryEventsService } from "~~/services/RepositoryEventsService";
import { EventBus, EventTypes } from "~~/services/EventBus";

// Connects the global WebSocket once per page load (client-only).
// Reconnects on auth changes, disconnects on app unmount.
export default defineNuxtPlugin((nuxtApp) => {
  RepositoryEventsService.connect();

  EventBus.on(EventTypes.AUTH_UPDATED, () => {
    RepositoryEventsService.reconnect();
  });

  nuxtApp.hook("app:beforeMount", () => {
    // Initial-load store wiring is owned by individual stores.
  });

  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => {
      RepositoryEventsService.disconnect();
    });
  }
});
