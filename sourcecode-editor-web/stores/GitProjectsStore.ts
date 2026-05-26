import { AuthService } from "~~/services/AuthService";
import Config from "~~/services/Config";
import axios from "axios";
import { handleError } from "~~/services/EventBus";
import { RepositoryEventsService } from "~~/services/RepositoryEventsService";
import { RepositoryEventTypes } from "~~/services/RepositoryEventTypes";
import type { RepositoryEvent } from "~~/services/RepositoryEventTypes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProjectEntry = any;

export const GitProjectsStore = defineStore("GitProjectsStore", {
  state: () => ({
    projects: [] as ProjectEntry[],
    eventsBound: false,
    fetching: false,
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
      this.fetching = true;
      try {
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
      } finally {
        this.fetching = false;
      }
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(GitProjectsStore, import.meta.hot));
}
