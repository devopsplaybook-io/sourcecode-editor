<template>
  <div id="github-page" class="signals-page">
    <div id="github-header">
      <h3>
        <i class="bi bi-github"></i> GitHub
        <i
          class="bi github-refresh-icon"
          :class="store.loading ? 'bi-arrow-repeat spin' : 'bi-arrow-clockwise'"
          @click="!store.loading && refresh()"
        ></i>
      </h3>
      <div class="header-actions">
        <button class="secondary" @click="openAddRepoDialog()">
          <i class="bi bi-plus-lg"></i> Add Repo
        </button>
      </div>
    </div>

    <div v-if="!store.enabled" class="github-disabled">
      <p>
        <i class="bi bi-info-circle"></i>
        Set <code>GITHUB_TOKEN</code> environment variable to enable GitHub
        features.
      </p>
    </div>

    <div
      v-else-if="store.loading && store.watchedRepos.length === 0"
      class="github-loading"
    >
      <Loading />
    </div>

    <div v-else-if="store.watchedRepos.length === 0" class="empty-state">
      <i class="bi bi-github"></i>
      <p>No watched repositories. Add a GitHub repo to get started.</p>
    </div>

    <div v-else class="signals-scroll">
      <div class="repo-grid">
        <article
          v-for="entry in store.watchedRepos"
          :key="entry.org + '/' + entry.repo"
          class="repo-card"
        >
          <header>
            <div class="repo-title">
              <strong>{{ entry.repo }}</strong>
              <span v-if="entry.repoInfo?.private" class="badge-private"
                >private</span
              >
              <span class="repo-org">{{ entry.org }}</span>
            </div>
            <div class="repo-actions">
              <i
                class="bi bi-box-arrow-up-right"
                title="Open on GitHub"
                @click="openGitHub(entry.repoInfo?.html_url)"
              ></i>
              <i
                class="bi bi-download"
                title="Clone as Project"
                @click="store.cloneRepo(entry.org, entry.repo)"
              ></i>
              <i
                class="bi bi-plus-square"
                title="Create Pull Request"
                @click="openCreatePR(entry.org, entry.repoInfo)"
              ></i>
              <i
                class="bi bi-trash"
                title="Remove from watch list"
                @click="removeRepo(entry.org, entry.repo)"
              ></i>
            </div>
          </header>

          <!-- Stats at a glance -->
          <div class="repo-stats">
            <span class="stat">
              <i class="bi bi-diagram-2"></i>
              {{ entry.branches ?? "..." }} branches
            </span>
            <span class="stat">
              <i class="bi bi-git-pull-request"></i>
              {{ entry.pulls.length }} PRs
            </span>
            <span class="stat" :class="successRateClass(entry)">
              <i class="bi bi-check-circle"></i>
              {{ formatSuccessRate(entry) }} success
            </span>
          </div>

          <!-- Pull Requests (expandable) -->
          <details :open="entry.expanded" @toggle="store.toggleRepo(entry)">
            <summary>
              <i class="bi bi-git-pull-request"></i>
              Pull Requests ({{ entry.pulls.length }})
            </summary>
            <div v-if="entry.pulls.length === 0" class="detail-empty">
              No open pull requests
            </div>
            <div v-for="pr in entry.pulls" :key="pr.number" class="pr-row">
              <span class="pr-info">
                <span
                  :class="
                    pr.draft
                      ? 'pr-status pr-draft'
                      : pr.state === 'open'
                        ? 'pr-status pr-open'
                        : 'pr-status pr-closed'
                  "
                >
                  {{ pr.draft ? "Draft" : pr.state }}
                </span>
                <span class="pr-title">
                  <a :href="pr.html_url" target="_blank">{{ pr.title }}</a>
                </span>
                <span class="pr-meta">
                  #{{ pr.number }} by {{ pr.user?.login }} |
                  {{ pr.head?.ref }}
                  <i class="bi bi-arrow-right"></i>
                  {{ pr.base?.ref }}
                </span>
              </span>
              <span class="pr-actions">
                <button
                  class="outline contrast pr-merge-btn"
                  @click="mergePR(entry.org, entry.repo, pr)"
                  :disabled="pr.draft || pr.state !== 'open'"
                >
                  <i class="bi bi-git-merge"></i> Merge
                </button>
              </span>
            </div>
          </details>

          <!-- Actions (expandable with refresh) -->
          <details
            :open="entry.actionsExpanded"
            @toggle="store.toggleActions(entry)"
          >
            <summary>
              <i class="bi bi-play-btn"></i>
              Actions ({{ entry.actions.length }})
              <button
                class="secondary outline action-refresh-btn"
                @click.stop="refreshActions(entry.org, entry.repo)"
                title="Refresh actions"
              >
                <i class="bi bi-arrow-clockwise"></i>
              </button>
            </summary>
            <div v-if="entry.actions.length === 0" class="detail-empty">
              No recent workflow runs
            </div>
            <div v-for="run in entry.actions" :key="run.id" class="action-row">
              <span class="action-info">
                <span
                  :class="actionStatusClass(run)"
                  class="action-status-icon"
                >
                  <i
                    v-if="
                      run.status === 'in_progress' ||
                      run.status === 'queued' ||
                      run.status === 'pending'
                    "
                    class="bi bi-hourglass-split"
                  ></i>
                  <i
                    v-else-if="run.conclusion === 'success'"
                    class="bi bi-check-circle-fill"
                  ></i>
                  <i
                    v-else-if="
                      run.conclusion === 'failure' ||
                      run.conclusion === 'cancelled'
                    "
                    class="bi bi-x-circle-fill"
                  ></i>
                  <i v-else class="bi bi-question-circle"></i>
                </span>
                <span class="action-name">
                  <a :href="run.html_url" target="_blank">
                    {{ run.name || "Workflow" }}
                  </a>
                </span>
                <span class="action-meta">
                  {{ run.status }}
                  <template v-if="run.conclusion">
                    | {{ run.conclusion }}
                  </template>
                </span>
              </span>
            </div>
          </details>
        </article>
      </div>
    </div>

    <!-- Add Repo Dialog -->
    <dialog :open="showAddRepoDialog" @click.self="closeAddRepoDialog">
      <article>
        <header>
          <button
            aria-label="Close"
            rel="prev"
            @click="closeAddRepoDialog"
          ></button>
          <h3><i class="bi bi-plus-lg"></i> Add GitHub Repository</h3>
        </header>
        <div>
          <label for="add-org">Organization</label>
          <select id="add-org" v-model="selectedOrg" @change="onOrgChange">
            <option disabled value="">Select organization</option>
            <option v-for="org in availableOrgs" :key="org" :value="org">
              {{ org }}
            </option>
          </select>

          <label for="add-repo">Repository</label>
          <select id="add-repo" v-model="selectedRepo" :disabled="!selectedOrg">
            <option disabled value="">Select repository</option>
            <option
              v-for="repo in availableReposForOrg"
              :key="repo.full_name"
              :value="repo.name"
            >
              {{ repo.name }}
            </option>
          </select>
        </div>
        <footer>
          <button class="secondary" @click="closeAddRepoDialog">Cancel</button>
          <button @click="addRepo" :disabled="!selectedOrg || !selectedRepo">
            <i class="bi bi-plus-lg"></i> Add
          </button>
        </footer>
      </article>
    </dialog>

    <!-- Create PR Dialog -->
    <DialogCreatePR
      v-if="showCreatePRDialog"
      :org-name="createPROrg"
      :repo-name="createPRRepo"
      :default-branch="createPRDefaultBranch"
      @onClose="onCloseCreatePRDialog"
      @onCreate="onCreatePR"
    />
  </div>
</template>

<script>
import { GitHubService } from "~~/services/GitHubService";
import { handleError, EventBus, EventTypes } from "~~/services/EventBus";

export default {
  data() {
    return {
      showAddRepoDialog: false,
      showCreatePRDialog: false,
      createPROrg: "",
      createPRRepo: "",
      createPRDefaultBranch: "",
      availableOrgs: [],
      availableRepos: {},
      selectedOrg: "",
      selectedRepo: "",
      loadingRepos: false,
    };
  },
  computed: {
    store() {
      return GitHubStore();
    },
    availableReposForOrg() {
      if (!this.selectedOrg) return [];
      return this.availableRepos[this.selectedOrg] || [];
    },
  },
  async created() {
    if (!(await AuthenticationStore().ensureAuthenticated())) {
      useRouter().push({ path: "/users" });
      return;
    }
    await this.store.init();
  },
  methods: {
    async refresh() {
      EventBus.emit(EventTypes.ALERT_MESSAGE, {
        type: "info",
        text: "Refreshing GitHub...",
      });
      await this.store.fetchWatchedRepos();
    },
    async openAddRepoDialog() {
      this.showAddRepoDialog = true;
      this.selectedOrg = "";
      this.selectedRepo = "";
      this.loadingRepos = true;
      try {
        const orgs = await GitHubService.listAllRepos();
        this.availableOrgs = Object.keys(orgs).sort();
        this.availableRepos = orgs;
      } catch (err) {
        handleError(err);
      } finally {
        this.loadingRepos = false;
      }
    },
    closeAddRepoDialog() {
      this.showAddRepoDialog = false;
      this.selectedOrg = "";
      this.selectedRepo = "";
    },
    async addRepo() {
      if (!this.selectedOrg || !this.selectedRepo) return;
      await this.store.addRepo(this.selectedOrg, this.selectedRepo);
      this.closeAddRepoDialog();
    },
    onOrgChange() {
      this.selectedRepo = "";
    },
    openGitHub(url) {
      if (url) window.open(url, "_blank");
    },
    openCreatePR(orgName, repoInfo) {
      if (!repoInfo) return;
      this.createPROrg = orgName;
      this.createPRRepo = repoInfo.name;
      this.createPRDefaultBranch = repoInfo.default_branch;
      this.showCreatePRDialog = true;
    },
    onCloseCreatePRDialog() {
      this.showCreatePRDialog = false;
      this.createPROrg = "";
      this.createPRRepo = "";
      this.createPRDefaultBranch = "";
    },
    async onCreatePR(orgName, repoName, title, head, base) {
      await this.store.createPR(orgName, repoName, title, head, base);
      this.onCloseCreatePRDialog();
    },
    async mergePR(orgName, repoName, pr) {
      if (
        !confirm(
          `Are you sure you want to merge PR #${pr.number}: "${pr.title}"?`,
        )
      ) {
        return;
      }
      await this.store.mergePR(orgName, repoName, pr.number);
    },
    async removeRepo(org, repo) {
      if (!confirm(`Remove ${org}/${repo} from watch list?`)) return;
      await this.store.removeRepo(org, repo);
    },
    async refreshActions(org, repo) {
      EventBus.emit(EventTypes.ALERT_MESSAGE, {
        type: "info",
        text: `Refreshing actions for ${org}/${repo}...`,
      });
      await this.store.refreshActions(org, repo);
    },
    formatSuccessRate(entry) {
      const completed = entry.actions.filter((r) => r.status === "completed");
      if (completed.length === 0) return "N/A";
      const successful = completed.filter((r) => r.conclusion === "success");
      return Math.round((successful.length / completed.length) * 100) + "%";
    },
    successRateClass(entry) {
      const completed = entry.actions.filter((r) => r.status === "completed");
      if (completed.length === 0) return "stat-neutral";
      const successful = completed.filter((r) => r.conclusion === "success");
      const rate = successful.length / completed.length;
      if (rate >= 0.8) return "stat-good";
      if (rate >= 0.5) return "stat-mid";
      return "stat-bad";
    },
    actionStatusClass(run) {
      if (
        run.status === "in_progress" ||
        run.status === "queued" ||
        run.status === "pending"
      ) {
        return "action-pending";
      }
      if (run.conclusion === "success") return "action-success";
      if (run.conclusion === "failure" || run.conclusion === "cancelled") {
        return "action-failure";
      }
      return "action-unknown";
    },
  },
};
</script>

<style scoped>
#github-page {
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100%;
  overflow: hidden;
}

#github-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--gap-section);
}

#github-header h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--gap-inline);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--gap-inline);
}

.header-actions button {
  margin: 0;
  font-size: var(--font-body);
  padding: var(--pad-button);
}

.github-refresh-icon {
  font-size: var(--font-icon-large);
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.github-refresh-icon:hover {
  opacity: 1;
}

.github-refresh-icon.spin {
  cursor: default;
}

.spin {
  display: inline-block;
  animation: spin-anim 1s linear infinite;
}

@keyframes spin-anim {
  to {
    transform: rotate(360deg);
  }
}

.github-disabled {
  text-align: center;
  padding: var(--pad-page);
  opacity: var(--opacity-muted);
}

.github-disabled code {
  background: var(--pico-code-background-color, #1e1e1e);
  padding: 0.2em 0.4em;
  border-radius: var(--pico-border-radius);
}

.github-loading {
  display: flex;
  justify-content: center;
  padding: var(--pad-page);
}

/* Signals-scroll is the scrollable content area */
.signals-scroll {
  overflow-y: auto;
  overflow-x: hidden;
}

/* Repo Cards Grid */
.repo-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--gap-section);
}

@media (min-width: 800px) {
  .repo-grid {
    grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
  }
}

.repo-card {
  margin: 0;
  padding: var(--pad-section);
}

.repo-card header {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--gap-inline);
  border: none;
}

.repo-title {
  display: flex;
  align-items: center;
  gap: var(--gap-tight);
  min-width: 0;
  overflow: hidden;
  padding: var(--pad-tight) 0;
}

.repo-title strong {
  font-size: var(--font-body-large);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.repo-org {
  font-size: var(--font-body);
  opacity: var(--opacity-muted);
  flex-shrink: 0;
}

.badge-private {
  font-size: var(--font-label);
  padding: 0.1em 0.4em;
  border-radius: var(--pico-border-radius);
  background: color-mix(in srgb, var(--pico-muted-color) 20%, transparent);
  color: var(--pico-muted-color);
  text-transform: uppercase;
  font-weight: 600;
}

.repo-actions {
  display: flex;
  gap: var(--gap-inline);
  flex-shrink: 0;
}

.repo-actions i {
  cursor: pointer;
  font-size: var(--font-body-large);
  opacity: 0.5;
  transition: opacity 0.2s;
}

.repo-actions i:hover {
  opacity: var(--opacity-hover);
}

/* Stats row */
.repo-stats {
  display: flex;
  gap: var(--gap-wide);
  padding: var(--pad-inline) 0;
  flex-wrap: wrap;
}

.stat {
  font-size: var(--font-body);
  display: flex;
  align-items: center;
  gap: var(--gap-tight);
  opacity: 0.8;
}

.stat i {
  font-size: var(--font-icon);
}

.stat-good {
  color: var(--pico-ins-color);
}

.stat-mid {
  color: var(--pico-primary);
}

.stat-bad {
  color: var(--pico-del-color);
}

.stat-neutral {
  opacity: 0.6;
}

/* Details sections */
details {
  margin-top: var(--gap-tight);
}

details summary {
  font-size: var(--font-body);
  display: flex;
  align-items: center;
  gap: var(--gap-tight);
  cursor: pointer;
  padding: var(--pad-tight) 0;
}

details summary i {
  font-size: var(--font-icon);
}

.action-refresh-btn {
  margin: 0;
  margin-left: auto;
  padding: var(--pad-button-sm);
  font-size: var(--font-meta);
}

.detail-empty {
  font-size: var(--font-body);
  opacity: 0.5;
  font-style: italic;
  padding: var(--pad-tight) 0;
}

/* PR Row */
.pr-row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: var(--gap-inline);
  padding: var(--pad-tight) 0;
  border-bottom: 1px solid var(--pico-muted-border-color, #333);
  font-size: var(--font-body);
}

.pr-row:last-child {
  border-bottom: none;
}

.pr-info {
  display: flex;
  align-items: center;
  gap: var(--gap-tight);
  min-width: 0;
  overflow: hidden;
}

.pr-status {
  font-size: var(--font-label);
  padding: 0.1em 0.4em;
  border-radius: var(--pico-border-radius);
  font-weight: 600;
  text-transform: uppercase;
  flex-shrink: 0;
}

.pr-open {
  color: var(--pico-ins-color);
  background: color-mix(in srgb, var(--pico-ins-color) 15%, transparent);
}

.pr-closed {
  color: var(--pico-primary);
  background: color-mix(in srgb, var(--pico-primary) 15%, transparent);
}

.pr-draft {
  opacity: 0.6;
  background: color-mix(in srgb, var(--pico-muted-color) 15%, transparent);
}

.pr-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pr-title a {
  text-decoration: none;
}

.pr-title a:hover {
  text-decoration: underline;
}

.pr-meta {
  font-size: var(--font-meta);
  opacity: var(--opacity-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pr-merge-btn {
  font-size: var(--font-meta);
  padding: var(--pad-button-sm);
  margin: 0;
}

/* Action Row */
.action-row {
  padding: var(--pad-tight) 0;
  border-bottom: 1px solid var(--pico-muted-border-color, #333);
  font-size: var(--font-body);
}

.action-row:last-child {
  border-bottom: none;
}

.action-info {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--gap-tight);
}

.action-status-icon {
  font-size: var(--font-icon);
}

.action-pending {
  color: var(--pico-muted-color);
}

.action-success {
  color: var(--pico-ins-color);
}

.action-failure {
  color: var(--pico-del-color);
}

.action-unknown {
  opacity: 0.5;
}

.action-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-name a {
  text-decoration: none;
}

.action-name a:hover {
  text-decoration: underline;
}

.action-meta {
  font-size: var(--font-meta);
  opacity: var(--opacity-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--pad-page);
  opacity: var(--opacity-muted);
  text-align: center;
}

.empty-state i {
  font-size: var(--font-icon-xl);
  margin-bottom: var(--gap-inline);
}
</style>
