<template>
  <div id="projects-layout">
    <div id="projects-actions" class="actions">
      <i class="bi bi-arrow-clockwise" v-on:click="refresh()"></i>
      <NuxtLink to="/projects/new"><i class="bi bi-plus-square"></i></NuxtLink>
    </div>
    <article
      v-for="project in gitProjectsStore.projects"
      :key="project.id"
      class="project-card"
    >
      <header>{{ project.name }}</header>
      <div v-if="project.status" class="action-controls">
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
      <div class="action-controls">
        <NuxtLink :to="'/projects/' + project.projectId"
          ><button><i class="bi bi-pencil-square"></i> Edit</button></NuxtLink
        >
        <button
          v-if="
            project.status.branchStatus &&
            project.status.branchStatus.behind > 0
          "
          @click="pullProject(project)"
        >
          Pull ({{ project.status.branchStatus.behind }} behind)
        </button>
        <button
          v-if="
            project.status.filesUpdateStatus &&
            project.status.filesUpdateStatus.length > 0
          "
          @click="commitProject(project)"
        >
          Commit
        </button>
        <button
          v-if="
            project.status.branchStatus && project.status.branchStatus.ahead > 0
          "
          @click="pushProject(project)"
        >
          Push ({{ project.status.branchStatus.ahead }} ahead)
        </button>
        <button v-if="!project.status" @click="cloneProject(project)">
          Clone
        </button>
        <!-- New buttons for branch creation and deletion -->
        <button @click="openCreateBranchDialog(project)">Create Branch</button>
        <button
          v-if="
            project.status.currentBranch != 'main' &&
            project.status.currentBranch != 'master'
          "
          @click="deleteBranch(project)"
        >
          Delete Branch
        </button>
      </div>
    </article>
    <DialogCommit
      v-if="showCommitDialog"
      :project="selectedProject"
      @onClose="onCloseDialog()"
    />
    <!-- Dialog for branch creation -->
    <DialogCreateBranch
      v-if="showCreateBranchDialog"
      :project="selectedProject"
      @onClose="onCloseDialog()"
    />
  </div>
</template>

<script setup>
const gitProjectsStore = GitProjectsStore();
</script>

<script>
import axios from "axios";
import Config from "~~/services/Config.ts";
import { handleError, EventBus, EventTypes } from "~~/services/EventBus";
import { AuthService } from "~~/services/AuthService";

export default {
  data() {
    return {
      selectedBranches: {},
      showCommitDialog: false,
      selectedProject: null,
      showCreateBranchDialog: false,
    };
  },
  async created() {
    if (!(await AuthenticationStore().ensureAuthenticated())) {
      useRouter().push({ path: "/users" });
    }
    GitProjectsStore().fetch();
  },
  methods: {
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
          GitProjectsStore().fetch();
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
          GitProjectsStore().fetch();
        })
        .catch(handleError);
    },
    commitProject(project) {
      this.selectedProject = project;
      this.showCommitDialog = true;
    },
    async pushProject(project) {
      axios
        .post(
          `${(await Config.get()).SERVER_URL}/projects/${
            project.projectId
          }/operations/push`,
          {},
          await AuthService.getAuthHeader()
        )
        .then(async (res) => {
          EventBus.emit(EventTypes.ALERT_MESSAGE, {
            type: "info",
            text: "Pushed",
          });
        })
        .catch(handleError);
    },
    onCloseDialog() {
      GitProjectsStore().fetch();
      this.selectedProject = null;
      this.showCommitDialog = false;
      this.showCreateBranchDialog = false;
    },
    refresh() {
      GitProjectsStore().fetch();
      EventBus.emit(EventTypes.ALERT_MESSAGE, {
        type: "info",
        text: "Refreshing...",
      });
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
          GitProjectsStore().fetch();
          EventBus.emit(EventTypes.ALERT_MESSAGE, {
            type: "info",
            text: "Checkout Branch: " + branch,
          });
        })
        .catch(handleError);
    },
    openCreateBranchDialog(project) {
      this.selectedProject = project;
      this.showCreateBranchDialog = true;
    },
    onCloseCreateBranchDialog() {
      this.selectedProject = null;
      this.showCreateBranchDialog = false;
    },
    async deleteBranch(project) {
      const branch =
        project.status && project.status.currentBranch
          ? project.status.currentBranch
          : null;
      if (!branch) {
        EventBus.emit(EventTypes.ALERT_MESSAGE, {
          type: "warning",
          text: "No branch selected for deletion.",
        });
        return;
      }
      if (
        !confirm(
          `Are you sure you want to delete branch "${branch}" for project "${project.name}"?`
        )
      )
        return;
      await axios
        .post(
          `${(await Config.get()).SERVER_URL}/projects/${
            project.projectId
          }/operations/branch/delete`,
          { branch },
          await AuthService.getAuthHeader()
        )
        .then(() => {
          EventBus.emit(EventTypes.ALERT_MESSAGE, {
            type: "info",
            text: "Branch deleted: " + branch,
          });
          this.refresh();
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
</style>
