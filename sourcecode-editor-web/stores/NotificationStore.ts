import { defineStore } from "pinia";
import { RepositoryEventsService } from "~~/services/RepositoryEventsService";
import { RepositoryEventTypes } from "~~/services/RepositoryEventTypes";
import type { RepositoryEvent } from "~~/services/RepositoryEventTypes";

export interface AppNotification {
  id: string;
  ts: number;
  eventType: string;
  severity: "error" | "info";
  title: string;
  repository: string;
  url?: string;
  read: boolean;
}

const STORAGE_KEY = "notifications";
const MAX_NOTIFICATIONS = 50;

export const NotificationStore = defineStore("NotificationStore", {
  state: () => ({
    notifications: [] as AppNotification[],
    eventsBound: false,
  }),

  getters: {
    unreadCount(state): number {
      return state.notifications.filter((n) => !n.read).length;
    },
  },

  actions: {
    init(): void {
      if (this.eventsBound) return;
      this.eventsBound = true;
      this.load();
      this.subscribe(
        RepositoryEventTypes.GITHUB_ACTIONS_FAILED,
        (event: RepositoryEvent) => {
          const detail = event.eventDetail as {
            org: string;
            repo: string;
            run: {
              id: number;
              name: string;
              html_url: string;
              conclusion: string | null;
              head_branch: string;
            };
          };
          this.push({
            severity: "error",
            title: `Actions failed: ${detail.run.name} (${detail.org}/${detail.repo})`,
            repository: `${detail.org}/${detail.repo}`,
            url: detail.run.html_url,
            eventType: RepositoryEventTypes.GITHUB_ACTIONS_FAILED,
          });
        },
      );
      this.subscribe(
        RepositoryEventTypes.GITHUB_PR_OPENED,
        (event: RepositoryEvent) => {
          const detail = event.eventDetail as {
            org: string;
            repo: string;
            pull: { number: number; title: string; html_url: string };
          };
          this.push({
            severity: "info",
            title: `PR opened: #${detail.pull.number} ${detail.pull.title} (${detail.org}/${detail.repo})`,
            repository: `${detail.org}/${detail.repo}`,
            url: detail.pull.html_url,
            eventType: RepositoryEventTypes.GITHUB_PR_OPENED,
          });
        },
      );
      this.subscribe(
        RepositoryEventTypes.GITHUB_PR_MERGED,
        (event: RepositoryEvent) => {
          const detail = event.eventDetail as {
            org: string;
            repo: string;
            pull: { number: number; title: string; html_url: string };
          };
          this.push({
            severity: "info",
            title: `PR merged: #${detail.pull.number} ${detail.pull.title} (${detail.org}/${detail.repo})`,
            repository: `${detail.org}/${detail.repo}`,
            url: detail.pull.html_url,
            eventType: RepositoryEventTypes.GITHUB_PR_MERGED,
          });
        },
      );
      this.subscribe(
        RepositoryEventTypes.GITHUB_PR_CLOSED,
        (event: RepositoryEvent) => {
          const detail = event.eventDetail as {
            org: string;
            repo: string;
            pull: { number: number; title: string; html_url: string };
          };
          this.push({
            severity: "info",
            title: `PR closed: #${detail.pull.number} ${detail.pull.title} (${detail.org}/${detail.repo})`,
            repository: `${detail.org}/${detail.repo}`,
            url: detail.pull.html_url,
            eventType: RepositoryEventTypes.GITHUB_PR_CLOSED,
          });
        },
      );
    },

    subscribe(eventType: string, handler: (event: RepositoryEvent) => void): void {
      RepositoryEventsService.on(eventType, handler);
    },

    push(input: {
      severity: "error" | "info";
      title: string;
      repository: string;
      url?: string;
      eventType: string;
    }): void {
      const notification: AppNotification = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        ts: Date.now(),
        eventType: input.eventType,
        severity: input.severity,
        title: input.title,
        repository: input.repository,
        url: input.url,
        read: false,
      };
      this.notifications.unshift(notification);
      if (this.notifications.length > MAX_NOTIFICATIONS) {
        this.notifications.splice(MAX_NOTIFICATIONS);
      }
      this.persist();
    },

    markRead(id: string): void {
      const notification = this.notifications.find((n) => n.id === id);
      if (notification && !notification.read) {
        notification.read = true;
        this.persist();
      }
    },

    markAllRead(): void {
      for (const notification of this.notifications) {
        notification.read = true;
      }
      this.persist();
    },

    clear(): void {
      this.notifications = [];
      this.persist();
    },

    load(): void {
      if (!import.meta.client) return;
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as AppNotification[];
          if (Array.isArray(parsed)) {
            this.notifications = parsed;
          }
        }
      } catch {
        // Corrupted storage: start with an empty list.
        this.notifications = [];
      }
    },

    persist(): void {
      if (!import.meta.client) return;
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(this.notifications),
        );
      } catch {
        // Storage full or unavailable: notifications stay in memory only.
      }
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(NotificationStore, import.meta.hot));
}
