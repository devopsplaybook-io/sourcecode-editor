<template>
  <div id="github-page" class="signals-page">
    <div id="github-header">
      <h3>
        <i class="bi bi-github"></i> GitHub
        <i
          v-if="store.loading"
          class="bi bi-arrow-repeat spin github-refresh-icon"
        ></i>
        <i
          v-else
          class="bi bi-arrow-clockwise github-refresh-icon"
          @click="refresh()"
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
        <div
          v-if="availableOrgs.length === 0 && !loadingOrgs"
          class="detail-empty"
          style="padding: 1rem 0"
        >
          Loading available repos...
        </div>
        <div v-else>
          <label for="add-org">Organization</label>
          <select id="add-org" v-model="selectedOrg">
            <option value="" disabled>Select organization</option>
            <option v-for="org in availableOrgs" :key="org" :value="org">
              {{ org }}
            </option>
          </select>

          <label v-if="selectedOrg" for="add-repo">Repository</label>
          <select v-if="selectedOrg" id="add-repo" v-model="selectedRepo">
            <option value="" disabled>Select repository</option>
            <option
              v-for="r in availableReposForOrg"
              :key="r.name"
              :value="r.name"
            >
              {{ r.name }}
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
      loadingOrgs: false,
    };
  },
  computed: {
    store() {
      return GitHubStore();
    },
    availableReposForOrg() {
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
      if (this.availableOrgs.length === 0 && !this.loadingOrgs) {
        this.loadingOrgs = true;
        try {
          const orgs = await GitHubService.getRepos();
          this.availableOrgs = Object.keys(orgs).sort();
          this.availableRepos = orgs;
        } catch (err) {
          handleError(err);
        } finally {
          this.loadingOrgs = false;
        }
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
  padding-bottom: 0.75rem;
}

#github-header h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-actions button {
  margin: 0;
  font-size: 0.85rem;
  padding: 0.3rem 0.6rem;
}

.github-refresh-icon {
  font-size: 1.1rem;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.github-refresh-icon:hover {
  opacity: 1;
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
  padding: 2rem;
  opacity: 0.7;
}

.github-disabled code {
  background: var(--pico-code-background-color, #1e1e1e);
  padding: 0.2em 0.4em;
  border-radius: var(--pico-border-radius);
}

.github-loading {
  display: flex;
  justify-content: center;
  padding: 2rem;
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
  gap: 0.75rem;
}

@media (min-width: 800px) {
  .repo-grid {
    grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
  }
}

.repo-card {
  margin: 0;
}

.repo-card header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0;
  border: none;
}

.repo-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.repo-title strong {
  font-size: 1rem;
}

.repo-org {
  font-size: 0.8rem;
  opacity: 0.6;
}

.badge-private {
  font-size: 0.65rem;
  padding: 0.1em 0.4em;
  border-radius: var(--pico-border-radius);
  background: color-mix(in srgb, var(--pico-muted-color) 20%, transparent);
  color: var(--pico-muted-color);
  text-transform: uppercase;
  font-weight: 600;
}

.repo-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.repo-actions i {
  cursor: pointer;
  font-size: 1rem;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.repo-actions i:hover {
  opacity: 1;
}

/* Stats row */
.repo-stats {
  display: flex;
  gap: 1.5rem;
  padding: 0.5rem 0;
  flex-wrap: wrap;
}

.stat {
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  opacity: 0.8;
}

.stat i {
  font-size: 0.9rem;
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
  margin-top: 0.3rem;
}

details summary {
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
  padding: 0.3rem 0;
}

details summary i {
  font-size: 0.9rem;
}

.action-refresh-btn {
  margin: 0;
  margin-left: auto;
  padding: 0.15rem 0.4rem;
  font-size: 0.75rem;
}

.detail-empty {
  font-size: 0.8rem;
  opacity: 0.5;
  font-style: italic;
  padding: 0.3rem 0;
}

/* PR Row */
.pr-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.3rem 0;
  border-bottom: 1px solid var(--pico-muted-border-color, #333);
  font-size: 0.82rem;
}

.pr-row:last-child {
  border-bottom: none;
}

.pr-info {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex: 1;
  min-width: 0;
}

.pr-status {
  font-size: 0.65rem;
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
  font-size: 0.75rem;
  opacity: 0.6;
  white-space: nowrap;
}

.pr-actions {
  flex-shrink: 0;
}

.pr-merge-btn {
  font-size: 0.72rem;
  padding: 0.15rem 0.4rem;
  margin: 0;
}

/* Action Row */
.action-row {
  padding: 0.3rem 0;
  border-bottom: 1px solid var(--pico-muted-border-color, #333);
  font-size: 0.82rem;
}

.action-row:last-child {
  border-bottom: none;
}

.action-info {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.action-status-icon {
  font-size: 0.9rem;
  flex-shrink: 0;
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
  font-size: 0.75rem;
  opacity: 0.6;
  margin-left: auto;
  white-space: nowrap;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  opacity: 0.6;
  text-align: center;
}

.empty-state i {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}
</style>
