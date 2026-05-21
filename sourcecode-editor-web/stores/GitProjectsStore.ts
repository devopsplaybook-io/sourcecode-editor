import { AuthService } from "~~/services/AuthService";
import Config from "~~/services/Config";
import axios from "axios";
import { handleError } from "~~/services/EventBus";
import { RepositoryEventsService } from "~~/services/RepositoryEventsService";
import { RepositoryEventTypes } from "~~/services/RepositoryEventTypes";
import type { RepositoryEvent } from "~~/services/RepositoryEventTypes";
import { GitHubService } from "~~/services/GitHubService";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProjectEntry = any;

export const GitProjectsStore = defineStore("GitProjectsStore", {
  state: () => ({
    projects: [] as ProjectEntry[],
    activityMap: {} as Record<string, number>,
    eventsBound: false,
  }),
  getters: {},
  actions: {
    // Subscribes once to the global event bus. Idempotent.
    bindEvents(): void {
      if (this.eventsBound) {
        return;
      }
      this.eventsBound = true;

      RepositoryEventsService.on(
        RepositoryEventTypes.GIT_STATUS_CHANGED,
        (event: RepositoryEvent) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const detail = event.eventDetail as any;
          this.applyStatus(event.repository, detail?.status);
        },
      );

      RepositoryEventsService.on(RepositoryEventTypes.PROJECT_CREATED, () => {
        // A new project may not be in the list yet — refresh once.
        this.fetch();
      });

      RepositoryEventsService.on(
        RepositoryEventTypes.PROJECT_UPDATED,
        (event: RepositoryEvent) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const detail = event.eventDetail as any;
          if (detail?.project) {
            this.applyProjectPatch(detail.project);
          }
        },
      );

      RepositoryEventsService.on(
        RepositoryEventTypes.PROJECT_DELETED,
        (event: RepositoryEvent) => {
          this.applyProjectDelete(event.repository);
        },
      );
    },

    applyStatus(projectId: string, status: unknown): void {
      const project = this.projects.find(
        (p: ProjectEntry) => p.projectId === projectId,
      );
      if (project) {
        project.status = status;
      }
    },

    applyProjectPatch(patch: ProjectEntry): void {
      const idx = this.projects.findIndex(
        (p: ProjectEntry) => p.projectId === patch.projectId,
      );
      if (idx >= 0) {
        this.projects[idx] = { ...this.projects[idx], ...patch };
      } else {
        this.projects.push(patch);
      }
    },

    applyProjectDelete(projectId: string): void {
      const idx = this.projects.findIndex(
        (p: ProjectEntry) => p.projectId === projectId,
      );
      if (idx >= 0) {
        this.projects.splice(idx, 1);
      }
    },

    async fetch(): Promise<void> {
      this.bindEvents();
      await axios
        .get(
          `${(await Config.get()).SERVER_URL}/projects`,
          await AuthService.getAuthHeader(),
        )
        .then(async (res) => {
          this.projects = res.data.projects;
          this.projects.forEach(async (project: ProjectEntry) => {
            axios
              .get(
                `${(await Config.get()).SERVER_URL}/projects/${
                  project.projectId
                }/status`,
                await AuthService.getAuthHeader(),
              )
              .then(async (statusRes) => {
                project.status = statusRes.data.status;
              })
              .catch(handleError);
          });
        })
        .catch(handleError);

      // Load GitHub activity data for sorting
      try {
        const activity = await GitHubService.getActivity();
        const activityMap: Record<string, number> = {};
        // Map project name patterns to activity timestamps
        for (const entry of activity) {
          const key = `${entry.org}/${entry.repo}`;
          activityMap[key] = entry.lastActivity || 0;
          // Also index by repo name alone
          activityMap[entry.repo] = Math.max(
            activityMap[entry.repo] || 0,
            entry.lastActivity || 0,
          );
        }
        this.activityMap = activityMap;
      } catch {
        // Activity data is optional for project ordering
      }

      // Sort projects: most recent activity first
      this.sortByActivity();
    },

    // Sort projects by GitHub activity descending (most recent first)
    sortByActivity(): void {
      this.projects.sort((a: ProjectEntry, b: ProjectEntry) => {
        const activityA = this.getActivityForProject(a);
        const activityB = this.getActivityForProject(b);
        return activityB - activityA;
      });
    },

    getActivityForProject(project: ProjectEntry): number {
      // Try matching by project name (which is often "org/repo")
      if (this.activityMap[project.name]) {
        return this.activityMap[project.name] || 0;
      }
      // Try by projectId lookup
      if (this.activityMap[project.projectId]) {
        return this.activityMap[project.projectId] || 0;
      }
      return 0;
    },

    getLastActivityText(project: ProjectEntry): string {
      const activity = this.getActivityForProject(project);
      if (!activity) return "";
      const diff = Date.now() - activity;
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "just now";
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    },

    hasRecentActivity(project: ProjectEntry): boolean {
      const activity = this.getActivityForProject(project);
      if (!activity) return false;
      return Date.now() - activity < 7 * 24 * 60 * 60 * 1000; // within 7 days
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(GitProjectsStore, import.meta.hot));
}
