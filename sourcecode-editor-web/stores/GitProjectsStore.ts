import { AuthService } from "~~/services/AuthService";
import Config from "~~/services/Config";
import axios from "axios";
import { handleError, EventBus, EventTypes } from "~~/services/EventBus";

export const GitProjectsStore = defineStore("GitProjectsStore", {
  state: () => ({
    projects: [],
  }),
  getters: {},
  actions: {
    async fetch(): Promise<void> {
      await axios
        .get(
          `${(await Config.get()).SERVER_URL}/projects`,
          await AuthService.getAuthHeader()
        )
        .then(async (res) => {
          this.projects = res.data.projects;
          this.projects.forEach(async (project: any) => {
            axios
              .get(
                `${(await Config.get()).SERVER_URL}/projects/${
                  project.projectId
                }/status`,
                await AuthService.getAuthHeader()
              )
              .then(async (res) => {
                project.status = res.data.status;
              })
              .catch(handleError);
          });
        })
        .catch(handleError);
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(GitProjectsStore, import.meta.hot));
}
