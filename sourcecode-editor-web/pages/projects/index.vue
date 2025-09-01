<template>
  <div id="projects-layout">
    <div id="projects-actions" class="actions">
      <i class="bi bi-arrow-clockwise" v-on:click="refresh()"></i>
      <NuxtLink to="/projects/new"><i class="bi bi-plus-square"></i></NuxtLink>
    </div>
    <article v-for="project in projects" :key="project.id" class="project-card">
      <header>{{ project.name }}</header>
      <div v-if="project.status" class="project-controls">
        <select
          class="branch-select"
          :value="project.status.currentBranch"
          @change="onBranchSelect(project, $event)"
        >
          <option
            v-for="branch in project.status.branches"
            :key="branch"
            :value="branch"
          >
            {{ branch }}
          </option>
        </select>
      </div>
      <div class="project-controls">
        <NuxtLink :to="'/projects/' + project.projectId"
          ><button><i class="bi bi-pencil-square"></i> Edit</button></NuxtLink
        >
        <button @click="pullProject(project)">Pull</button>
        <button @click="commitPushProject(project)">Commit/Push</button>
        <button v-if="!project.status" @click="cloneProject(project)">
          Clone
        </button>
      </div>
    </article>
    <DialogCommitPush
      v-if="showCommitPushDialog"
      :project="selectedProject"
      @onClose="onCloseDialog()"
    />
  </div>
</template>

<script>
import axios from "axios";
import Config from "~~/services/Config.ts";
import { handleError, EventBus, EventTypes } from "~~/services/EventBus";
import { AuthService } from "~~/services/AuthService";

export default {
  data() {
    return {
      projects: [],
      projectsStatuses: [],
      selectedBranches: {},
      showCommitPushDialog: false,
      selectedProject: null,
    };
  },
  async created() {
    if (!(await AuthenticationStore().ensureAuthenticated())) {
      useRouter().push({ path: "/users" });
    }
    this.fetchProjects();
  },
  methods: {
    async fetchProjects() {
      await axios
        .get(
          `${(await Config.get()).SERVER_URL}/projects`,
          await AuthService.getAuthHeader()
        )
        .then(async (res) => {
          this.projects = res.data.projects;
          this.projects.forEach(async (project) => {
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
    async cloneProject(project) {
      axios
        .post(
          `${(await Config.get()).SERVER_URL}/projects/${
            project.projectId
          }/operations/clone`,
          {},
          await AuthService.getAuthHeader()
        )
        .then(async (res) => {
          EventBus.emit(EventTypes.ALERT_MESSAGE, {
            type: "info",
            text: "Repository Cloned",
          });
        })
        .catch(handleError);
    },
    async pullProject(project) {
      axios
        .post(
          `${(await Config.get()).SERVER_URL}/projects/${
            project.projectId
          }/operations/pull`,
          {},
          await AuthService.getAuthHeader()
        )
        .then(async (res) => {
          EventBus.emit(EventTypes.ALERT_MESSAGE, {
            type: "info",
            text: "Pulled",
          });
        })
        .catch(handleError);
    },
    commitPushProject(project) {
      this.selectedProject = project;
      this.showCommitPushDialog = true;
    },
    onCloseDialog() {
      this.selectedProject = null;
      this.showCommitPushDialog = false;
    },
    refresh() {
      this.fetchProjects();
    },
    async onBranchSelect(project, event) {
      const branch = event.target.value;
      await axios
        .post(
          `${(await Config.get()).SERVER_URL}/projects/${
            project.projectId
          }/operations/checkout`,
          { branch },
          await AuthService.getAuthHeader()
        )
        .then(async (res) => {
          EventBus.emit(EventTypes.ALERT_MESSAGE, {
            type: "info",
            text: "Checkout Branch: " + branch,
          });
        })
        .catch(handleError);
    },
  },
};
</script>

<style>
#object-layout {
  display: grid;
  max-height: 100%;
  height: auto;
  grid-template-rows: auto auto 1fr;
}
#object-actions {
  display: grid;
  grid-template-columns: 1fr auto;
}
#object-actions span {
  padding-top: 0.3rem;
}
#object-search {
  padding-top: 0.5em;
  padding-bottom: 0.5em;
  padding-left: 3em;
  height: 2.6rem;
}

#object-list {
  overflow-x: auto;
  overflow-y: auto;
  height: 100%;
  width: 100%;
}
#object-list td {
  white-space: nowrap;
}

#object-list td,
#object-list pre,
#object-list div,
#object-list span,
#object-list p {
  font-size: 0.9em;
}

.project-controls button {
  margin-right: 0.5rem;
}
</style>
