<template>
  <div id="projects-layout">
    <div id="projects-actions" class="actions">
      <i class="bi bi-arrow-clockwise" v-on:click="refresh()"></i>
      <NuxtLink to="/projects/new"><i class="bi bi-plus-square"></i></NuxtLink>
      <SyncedIndicator :ts="latestSyncTs" />
    </div>
    <div
      v-if="gitProjectsStore.fetching && !gitProjectsStore.projects.length"
      class="empty-state"
    >
      <Loading />
    </div>
    <div v-else-if="!gitProjectsStore.projects.length" class="empty-state">
      <i class="bi bi-journals"></i>
      <p>No repositories yet. Add your first repository to get started.</p>
      <NuxtLink to="/projects/new" class="empty-state-action"
        >Add your first repository</NuxtLink
      >
    </div>
    <template v-else>
      <article
        v-for="project in gitProjectsStore.projects"
        :key="project.id"
        class="project-card"
      >
        <header>
          {{ project.name }}
          <span class="activity-indicators">
            <span
              v-if="repositoryEventsStore.isBusy(project.projectId)"
              class="project-busy"
              :title="repositoryEventsStore.activeOperation(project.projectId)"
            >
              <i class="bi bi-arrow-repeat spin"></i>
              <span
                v-if="repositoryEventsStore.activeOperationLabel(project.projectId)"
                class="project-busy-label"
                >{{ repositoryEventsStore.activeOperationLabel(project.projectId) }}…</span
              >
            </span>
          </span>
        </header>
        <div
          v-if="githubMatch(project)"
          class="action-controls github-linkage"
        >
          <NuxtLink
            to="/github"
            class="github-linkage-badge"
            title="Pull requests on the GitHub page"
          >
            <i class="bi bi-git-pull-request"></i>
            {{ githubOpenPRCount(githubMatch(project)) }} PRs
          </NuxtLink>
          <NuxtLink
            to="/github"
            class="github-linkage-badge"
            :title="'Latest GitHub Actions: ' + githubActionsLabel(githubMatch(project))"
          >
            <i :class="githubActionsIcon(githubMatch(project))"></i>
            Actions
          </NuxtLink>
          <button
            class="secondary"
            title="Create a pull request from the current branch"
            :disabled="
              !project.status?.currentBranch ||
              gitProjectsStore.fetching ||
              repositoryEventsStore.isBusy(project.projectId)
            "
            @click="openCreatePRForProject(project)"
          >
            <i class="bi bi-git-pull-request"></i> Create PR
          </button>
        </div>
        <div v-if="project.status" class="action-controls">
          <select
            class="branch-select"
            :value="project.status.currentBranch"
            :disabled="
              gitProjectsStore.fetching ||
              repositoryEventsStore.isBusy(project.projectId)
            "
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
          <span
            v-if="
              project.status.branchStatus &&
              (project.status.branchStatus.ahead > 0 ||
                project.status.branchStatus.behind > 0)
            "
            class="branch-status-badges"
          >
            <span
              v-if="project.status.branchStatus.ahead > 0"
              class="branch-badge"
              title="Commits ahead of origin"
              >↑{{ project.status.branchStatus.ahead }}</span
            >
            <span
              v-if="project.status.branchStatus.behind > 0"
              class="branch-badge"
              title="Commits behind origin"
              >↓{{ project.status.branchStatus.behind }}</span
            >
          </span>
        </div>
        <div class="action-controls">
          <button
            v-if="
              gitProjectsStore.fetching ||
              repositoryEventsStore.isBusy(project.projectId)
            "
            disabled
          >
            <i class="bi bi-pencil-square"></i> Edit
          </button>
          <NuxtLink v-else :to="'/projects/' + project.projectId"
            ><button><i class="bi bi-pencil-square"></i> Edit</button></NuxtLink
          >
          <button
            v-if="project.status"
            :disabled="
              gitProjectsStore.fetching ||
              repositoryEventsStore.isBusy(project.projectId)
            "
            @click="historyProject(project)"
          >
            <i class="bi bi-clock-history"></i> History
          </button>
          <button
            v-if="project.status?.branchStatus?.behind > 0"
            :disabled="
              gitProjectsStore.fetching ||
              repositoryEventsStore.isBusy(project.projectId)
            "
            @click="pullProject(project)"
          >
            Pull ({{ project.status?.branchStatus?.behind }} behind)
          </button>
          <button
            v-if="project.status?.filesUpdateStatus?.length > 0"
            :disabled="
              gitProjectsStore.fetching ||
              repositoryEventsStore.isBusy(project.projectId)
            "
            @click="commitProject(project)"
          >
            Commit
          </button>
          <button
            v-if="project.status?.branchStatus?.ahead > 0"
            :disabled="
              gitProjectsStore.fetching ||
              repositoryEventsStore.isBusy(project.projectId)
            "
            @click="pushProject(project)"
          >
            Push ({{ project.status?.branchStatus?.ahead }} ahead)
          </button>
          <button
            v-if="!project.status"
            :disabled="
              gitProjectsStore.fetching ||
              repositoryEventsStore.isBusy(project.projectId)
            "
            @click="cloneProject(project)"
          >
            Clone
          </button>
          <!-- New buttons for branch creation and deletion -->
          <button
            :disabled="
              gitProjectsStore.fetching ||
              repositoryEventsStore.isBusy(project.projectId)
            "
            @click="openCreateBranchDialog(project)"
          >
            Create Branch
          </button>
          <button
            v-if="
              project.status?.currentBranch &&
              project.status.currentBranch != 'main' &&
              project.status.currentBranch != 'master'
            "
            :disabled="
              gitProjectsStore.fetching ||
              repositoryEventsStore.isBusy(project.projectId)
            "
            @click="deleteBranch(project)"
          >
            Delete Branch
          </button>
          <button
            class="secondary"
            :title="'Remove ' + project.name + ' from the application'"
            :disabled="
              gitProjectsStore.fetching ||
              repositoryEventsStore.isBusy(project.projectId)
            "
            @click="removeProject(project)"
          >
            <i class="bi bi-trash"></i> Remove
          </button>
        </div>
      </article>
    </template>
    <DialogCommit
      v-if="showCommitDialog"
      :project="selectedProject"
      @onClose="onCloseDialog()"
    />
    <DialogHistory
      v-if="showHistoryDialog"
      :project="selectedProject"
      @onClose="onCloseDialog()"
    />
    <!-- Dialog for branch creation -->
    <DialogCreateBranch
      v-if="showCreateBranchDialog"
      :project="selectedProject"
      @onClose="onCloseDialog()"
    />
    <!-- Dialog for PR creation from a project card -->
    <DialogCreatePR
      v-if="showCreatePRDialog"
      :org-name="createPROrg"
      :repo-name="createPRRepo"
      :default-branch="createPRDefaultBranch"
      :head-options="createPRHeadOptions"
      :preselected-head="createPRPreselectedHead"
      @onClose="onCloseCreatePRDialog()"
      @onCreate="onCreatePRForProject"
    />
  </div>
</template>

<script setup>
const gitProjectsStore = GitProjectsStore();
const repositoryEventsStore = RepositoryEventsStore();
repositoryEventsStore.init();
const gitHubStore = GitHubStore();
gitHubStore.init();
</script>

<script>
import axios from "axios";
import Config from "~~/services/Config.ts";
import { handleError, EventBus, EventTypes } from "~~/services/EventBus";
import { AuthService } from "~~/services/AuthService";
import { RepoUrlOwnerRepoFromUrl } from "~~/services/RepoUrl";

export default {
  data() {
    return {
      selectedBranches: {},
      showCommitDialog: false,
      selectedProject: null,
      showCreateBranchDialog: false,
      showHistoryDialog: false,
      showCreatePRDialog: false,
      createPROrg: "",
      createPRRepo: "",
      createPRDefaultBranch: "main",
      createPRHeadOptions: [],
      createPRPreselectedHead: "",
      fetchedTs: 0,
    };
  },
  computed: {
    latestSyncTs() {
      const statusTs = GitProjectsStore().projects.reduce(
        (max, project) =>
          project.status?.lastSyncTs
            ? Math.max(max, project.status.lastSyncTs)
            : max,
        0,
      );
      return statusTs || this.fetchedTs;
    },
  },
  async created() {
    if (!(await AuthenticationStore().ensureAuthenticated())) {
      useRouter().push({ path: "/users" });
    }
    GitProjectsStore().fetch();
    this.fetchedTs = Date.now();
  },
  methods: {
    async cloneProject(project) {
      axios
        .post(
          `${(await Config.get()).SERVER_URL}/projects/${
            project.projectId
          }/operations/clone`,
          {},
          await AuthService.getAuthHeader(),
        )
        .then(async () => {
          EventBus.emit(EventTypes.ALERT_MESSAGE, {
            type: "info",
            text: "Repository Cloned",
          });
          // No imperative refetch: server broadcasts git.clone.completed +
          // git.status.changed; GitProjectsStore subscribes to those.
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
          await AuthService.getAuthHeader(),
        )
        .then(async () => {
          EventBus.emit(EventTypes.ALERT_MESSAGE, {
            type: "info",
            text: "Pulled",
          });
          // git.status.changed event will refresh the store.
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
          await AuthService.getAuthHeader(),
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
      // Dialogs that mutate state (commit, branch create) trigger server-side
      // events; no manual refetch is needed.
      this.selectedProject = null;
      this.showCommitDialog = false;
      this.showCreateBranchDialog = false;
      this.showHistoryDialog = false;
    },
    refresh() {
      GitProjectsStore().fetch();
      this.fetchedTs = Date.now();
      EventBus.emit(EventTypes.ALERT_MESSAGE, {
        type: "info",
        text: "Refreshing...",
      });
    },
    githubMatch(project) {
      const ownerRepo = RepoUrlOwnerRepoFromUrl(project.info?.url);
      if (!ownerRepo) return null;
      return (
        GitHubStore().watchedRepos.find(
          (entry) =>
            entry.org === ownerRepo.owner && entry.repo === ownerRepo.repo,
        ) || null
      );
    },
    githubOpenPRCount(entry) {
      return entry.pulls.filter((p) => p.state === "open").length;
    },
    githubActionsIcon(entry) {
      const completed = entry.actions.filter((r) => r.status === "completed");
      if (completed.length === 0) return "bi bi-question-circle";
      const successful = completed.filter((r) => r.conclusion === "success");
      const rate = successful.length / completed.length;
      if (rate >= 0.5) return "bi bi-check-circle-fill";
      return "bi bi-x-circle-fill";
    },
    githubActionsLabel(entry) {
      const completed = entry.actions.filter((r) => r.status === "completed");
      if (completed.length === 0) return "unknown";
      const successful = completed.filter((r) => r.conclusion === "success");
      return Math.round((successful.length / completed.length) * 100) + "% success";
    },
    openCreatePRForProject(project) {
      const entry = this.githubMatch(project);
      if (!entry || !entry.repoInfo) return;
      this.createPROrg = entry.org;
      this.createPRRepo = entry.repo;
      this.createPRDefaultBranch = entry.repoInfo.default_branch || "main";
      this.createPRHeadOptions = project.status?.branches ?? [];
      this.createPRPreselectedHead = project.status?.currentBranch || "";
      this.showCreatePRDialog = true;
    },
    onCloseCreatePRDialog() {
      this.showCreatePRDialog = false;
      this.createPROrg = "";
      this.createPRRepo = "";
      this.createPRDefaultBranch = "main";
      this.createPRHeadOptions = [];
      this.createPRPreselectedHead = "";
    },
    async onCreatePRForProject(orgName, repoName, title, head, base) {
      await GitHubStore().createPR(orgName, repoName, title, head, base);
      this.onCloseCreatePRDialog();
    },
    async onBranchSelect(project, event) {
      const branch = event.target.value;
      const dirtyCount =
        project.status && project.status.filesUpdateStatus
          ? project.status.filesUpdateStatus.length
          : 0;
      if (dirtyCount > 0) {
        if (
          !confirm(
            `Project "${project.name}" has ${dirtyCount} uncommitted change(s) that may be lost or carried over to the other branch. Switch to "${branch}" anyway?`,
          )
        ) {
          event.target.value = project.status.currentBranch;
          return;
        }
      }
      await axios
        .post(
          `${(await Config.get()).SERVER_URL}/projects/${
            project.projectId
          }/operations/checkout`,
          { branch },
          await AuthService.getAuthHeader(),
        )
        .then(async () => {
          // git.status.changed will refresh the store with the new branch.
          EventBus.emit(EventTypes.ALERT_MESSAGE, {
            type: "info",
            text: "Checkout Branch: " + branch,
          });
        })
        .catch(handleError);
    },
    historyProject(project) {
      this.selectedProject = project;
      this.showHistoryDialog = true;
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
          `Are you sure you want to delete branch "${branch}" for project "${project.name}"?`,
        )
      )
        return;
      await axios
        .post(
          `${(await Config.get()).SERVER_URL}/projects/${
            project.projectId
          }/operations/branch/delete`,
          { branch },
          await AuthService.getAuthHeader(),
        )
        .then(() => {
          EventBus.emit(EventTypes.ALERT_MESSAGE, {
            type: "info",
            text: "Branch deleted: " + branch,
          });
          // git.branch.deleted + git.status.changed will refresh the store.
        })
        .catch(handleError);
    },
    async removeProject(project) {
      if (
        !confirm(
          `Remove repository "${project.name}" from the application? ` +
            "The remote repository is not deleted; only its local copy and entry are removed.",
        )
      )
        return;
      await axios
        .delete(
          `${(await Config.get()).SERVER_URL}/projects/${project.projectId}`,
          await AuthService.getAuthHeader(),
        )
        .then(() => {
          EventBus.emit(EventTypes.ALERT_MESSAGE, {
            type: "info",
            text: "Repository removed: " + project.name,
          });
          // project.deleted event will remove it from the store.
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
  padding-top: var(--pad-tight);
}
#object-search {
  padding-top: var(--gap-inline);
  padding-bottom: var(--gap-inline);
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
  font-size: var(--font-icon);
}
.project-busy {
  margin-left: var(--gap-inline);
  font-size: var(--font-body);
  opacity: 0.7;
}
.project-busy .spin {
  display: inline-block;
  animation: project-busy-spin 1s linear infinite;
}
.project-busy-label {
  margin-left: 0.4em;
}
.branch-status-badges {
  display: inline-flex;
  align-items: center;
  gap: var(--gap-tight);
  margin-left: var(--gap-inline);
}
.branch-badge {
  font-size: var(--font-icon);
  border: 1px solid currentColor;
  border-radius: 2px;
  padding: 0 0.3em;
  opacity: 0.85;
  white-space: nowrap;
}
@keyframes project-busy-spin {
  to {
    transform: rotate(360deg);
  }
}

.activity-indicators {
  display: inline-flex;
  align-items: center;
  gap: var(--gap-tight);
  margin-left: var(--gap-inline);
}

.github-linkage {
  display: flex;
  align-items: center;
  gap: var(--gap-inline);
  flex-wrap: wrap;
}
.github-linkage-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3em;
  font-size: var(--font-icon);
  text-decoration: none;
  border: 1px solid currentColor;
  border-radius: 2px;
  padding: 0 0.3em;
  opacity: 0.85;
  white-space: nowrap;
}
.github-linkage-badge:hover {
  opacity: 1;
}
</style>
