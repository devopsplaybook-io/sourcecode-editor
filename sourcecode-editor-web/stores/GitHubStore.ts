import { defineStore } from "pinia";
import {
  GitHubService,
  type WatchedRepoEntry,
} from "~~/services/GitHubService";
import { handleError, EventBus, EventTypes } from "~~/services/EventBus";
import { RepositoryEventsService } from "~~/services/RepositoryEventsService";
import { RepositoryEventTypes } from "~~/services/RepositoryEventTypes";

export const GitHubStore = defineStore("GitHubStore", {
  state: () => ({
    enabled: false,
    watchedRepos: [] as WatchedRepoEntry[],
    loading: false,
    initialized: false,
    lastUpdated: 0,
    eventsBound: false,
  }),

  actions: {
    async init(): Promise<void> {
      if (this.initialized) return;
      this.initialized = true;
      this.bindEvents();
      try {
        this.enabled = await GitHubService.isEnabled();
        if (this.enabled) {
          await this.fetchWatchedRepos();
        }
      } catch {
        this.enabled = false;
      }
    },

    bindEvents(): void {
      if (this.eventsBound) return;
      this.eventsBound = true;

      let debounceTimer: ReturnType<typeof setTimeout> | null = null;

      RepositoryEventsService.on(
        RepositoryEventTypes.GITHUB_CACHE_UPDATED,
        () => {
          // Debounce: coalesce rapid events (e.g. action refresh triggers
          // both an explicit fetch and a WebSocket event, causing flicker)
          if (debounceTimer) {
            clearTimeout(debounceTimer);
          }
          debounceTimer = setTimeout(() => {
            this.fetchWatchedRepos();
            debounceTimer = null;
          }, 1500);
        },
      );
    },

    async fetchWatchedRepos(): Promise<void> {
      if (!this.enabled) return;
      this.loading = true;
      try {
        const entries = await GitHubService.getWatchedRepos();

        // Preserve local UI toggle states (expanded/actionsExpanded)
        // so that replacing watchedRepos doesn't collapse open sections
        const prevState = new Map(
          this.watchedRepos.map((e) => [
            `${e.org}/${e.repo}`,
            { expanded: e.expanded, actionsExpanded: e.actionsExpanded },
          ]),
        );
        for (const entry of entries) {
          const key = `${entry.org}/${entry.repo}`;
          const prev = prevState.get(key);
          if (prev) {
            entry.expanded = prev.expanded;
            entry.actionsExpanded = prev.actionsExpanded;
          }
        }

        this.watchedRepos = entries;
        this.lastUpdated = Date.now();
      } catch (err) {
        handleError(err);
      } finally {
        this.loading = false;
      }
    },

    async addRepo(org: string, repo: string): Promise<void> {
      try {
        await GitHubService.addWatchedRepo(org, repo);
        await this.fetchWatchedRepos();
        EventBus.emit(EventTypes.ALERT_MESSAGE, {
          type: "info",
          text: `Added ${org}/${repo} to watch list`,
        });
      } catch (err) {
        handleError(err);
      }
    },

    async removeRepo(org: string, repo: string): Promise<void> {
      try {
        await GitHubService.removeWatchedRepo(org, repo);
        await this.fetchWatchedRepos();
        EventBus.emit(EventTypes.ALERT_MESSAGE, {
          type: "info",
          text: `Removed ${org}/${repo} from watch list`,
        });
      } catch (err) {
        handleError(err);
      }
    },

    async refreshActions(org: string, repo: string): Promise<void> {
      try {
        await GitHubService.refreshActions(org, repo);
        // After refresh, re-fetch watched repos to get updated data
        await this.fetchWatchedRepos();
        EventBus.emit(EventTypes.ALERT_MESSAGE, {
          type: "info",
          text: `Actions refreshed for ${org}/${repo}`,
        });
      } catch (err) {
        handleError(err);
      }
    },

    toggleRepo(entry: WatchedRepoEntry): void {
      entry.expanded = !entry.expanded;
    },

    toggleActions(entry: WatchedRepoEntry): void {
      entry.actionsExpanded = !entry.actionsExpanded;
    },

    async cloneRepo(orgName: string, repoName: string): Promise<void> {
      try {
        await GitHubService.cloneRepo(orgName, repoName);
        EventBus.emit(EventTypes.ALERT_MESSAGE, {
          type: "info",
          text: `Cloning ${orgName}/${repoName}...`,
        });
      } catch (err) {
        handleError(err);
      }
    },

    async createPR(
      orgName: string,
      repoName: string,
      title: string,
      head: string,
      base: string,
    ): Promise<void> {
      try {
        await GitHubService.createPR(orgName, repoName, title, head, base);
        EventBus.emit(EventTypes.ALERT_MESSAGE, {
          type: "info",
          text: `PR created in ${orgName}/${repoName}`,
        });
        await this.fetchWatchedRepos();
      } catch (err) {
        handleError(err);
      }
    },

    async mergePR(
      orgName: string,
      repoName: string,
      prNumber: number,
    ): Promise<void> {
      try {
        await GitHubService.mergePR(orgName, repoName, prNumber);
        EventBus.emit(EventTypes.ALERT_MESSAGE, {
          type: "info",
          text: `PR #${prNumber} merged in ${orgName}/${repoName}`,
        });
        await this.fetchWatchedRepos();
      } catch (err) {
        handleError(err);
      }
    },
  },
});
