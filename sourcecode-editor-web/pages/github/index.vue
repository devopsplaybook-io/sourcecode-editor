<template>
  <div id="github-page">
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
          v-on:click="refresh()"
        ></i>
      </h3>
    </div>

    <div v-if="!store.enabled" class="github-disabled">
      <p>
        <i class="bi bi-info-circle"></i>
        Set <code>GITHUB_TOKEN</code> environment variable to enable GitHub
        features.
      </p>
    </div>

    <div
      v-else-if="store.loading && orgNames.length === 0"
      class="github-loading"
    >
      <Loading />
    </div>

    <div v-else id="github-content">
      <div v-for="orgName in orgNames" :key="orgName" class="org-section">
        <details
          :open="store.organizations[orgName]?.expanded"
          @toggle="onToggleOrg(orgName)"
        >
          <summary class="org-summary">
            <i class="bi bi-people-fill"></i>
            <strong>{{ orgName }}</strong>
            <span class="org-repo-count"
              >({{ store.organizations[orgName]?.repos.length }} repos)</span
            >
          </summary>

          <div class="org-repos-grid">
            <article
              v-for="entry in store.organizations[orgName]?.repos"
              :key="entry.repo.id"
              class="repo-card"
            >
              <header class="repo-header">
                <span class="repo-name">
                  <i
                    :class="
                      entry.expanded
                        ? 'bi bi-chevron-down'
                        : 'bi bi-chevron-right'
                    "
                    class="repo-expand-icon"
                    @click="store.toggleRepo(orgName, entry.repo.name)"
                  ></i>
                  {{ entry.repo.name }}
                  <i
                    v-if="entry.repo.private"
                    class="bi bi-lock-fill repo-private-icon"
                    title="Private"
                  ></i>
                </span>
                <span class="repo-actions">
                  <i
                    class="bi bi-download"
                    title="Clone as Project"
                    @click="store.cloneRepo(orgName, entry.repo.name)"
                  ></i>
                  <i
                    class="bi bi-plus-square"
                    title="Create Pull Request"
                    @click="openCreatePR(orgName, entry.repo)"
                  ></i>
                  <a
                    :href="entry.repo.html_url"
                    target="_blank"
                    title="Open on GitHub"
                    ><i class="bi bi-box-arrow-up-right"></i
                  ></a>
                </span>
              </header>

              <div v-if="entry.expanded" class="repo-details">
                <div
                  v-if="entry.pullsLoading || entry.actionsLoading"
                  class="repo-details-loading"
                >
                  <Loading />
                </div>
                <div v-else class="repo-details-content">
                  <!-- Pull Requests Section -->
                  <div class="detail-section">
                    <h6>
                      <i class="bi bi-git-pull-request"></i> Pull Requests
                    </h6>
                    <div v-if="entry.pulls.length === 0" class="detail-empty">
                      No open pull requests
                    </div>
                    <div
                      v-for="pr in entry.pulls"
                      :key="pr.number"
                      class="pr-row"
                    >
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
                          <a :href="pr.html_url" target="_blank">{{
                            pr.title
                          }}</a>
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
                          @click="mergePR(orgName, entry.repo.name, pr)"
                          :disabled="pr.draft || pr.state !== 'open'"
                        >
                          <i class="bi bi-git-merge"></i> Merge
                        </button>
                      </span>
                    </div>
                  </div>

                  <!-- Actions Section -->
                  <div class="detail-section">
                    <h6><i class="bi bi-play-btn"></i> Latest Actions</h6>
                    <div v-if="entry.actions.length === 0" class="detail-empty">
                      No recent workflow runs
                    </div>
                    <div
                      v-for="run in entry.actions"
                      :key="run.id"
                      class="action-row"
                    >
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
                  </div>
                </div>
              </div>
            </article>
          </div>
        </details>
      </div>
    </div>

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
      showCreatePRDialog: false,
      createPROrg: "",
      createPRRepo: "",
      createPRDefaultBranch: "",
    };
  },
  computed: {
    store() {
      return GitHubStore();
    },
    orgNames() {
      return Object.keys(this.store.organizations).sort();
    },
  },
  async created() {
    if (!(await AuthenticationStore().ensureAuthenticated())) {
      useRouter().push({ path: "/users" });
      return;
    }
    await this.store.init();
    if (this.store.enabled) {
      await this.store.fetchRepos();
    }
  },
  methods: {
    async refresh() {
      EventBus.emit(EventTypes.ALERT_MESSAGE, {
        type: "info",
        text: "Refreshing GitHub...",
      });
      await this.store.fetchRepos();
    },
    onToggleOrg(orgName) {
      this.store.toggleOrg(orgName);
    },
    openCreatePR(orgName, repo) {
      this.createPROrg = orgName;
      this.createPRRepo = repo.name;
      this.createPRDefaultBranch = repo.default_branch;
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
  padding-bottom: 0.5rem;
}
#github-header h3 {
  margin: 0;
}
.github-refresh-icon {
  margin-left: 0.5rem;
  font-size: 1rem;
  cursor: pointer;
  opacity: 0.7;
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
  border-radius: 4px;
}
.github-loading {
  display: flex;
  justify-content: center;
  padding: 2rem;
}

#github-content {
  overflow-y: auto;
  overflow-x: hidden;
}

/* Organization Sections */
.org-section {
  margin-bottom: 0.5rem;
}
.org-summary {
  cursor: pointer;
  padding: 0.5rem 0;
  font-size: 1.1rem;
}
.org-summary i {
  margin-right: 0.4rem;
}
.org-repo-count {
  opacity: 0.6;
  font-size: 0.85rem;
  margin-left: 0.4rem;
}

/* Repos Grid */
.org-repos-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
  padding-left: 1.5rem;
}

.repo-card {
  margin: 0;
  padding: 0.5rem;
}
.repo-card header {
  padding: 0;
  border: none;
}
.repo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.repo-name {
  font-weight: 600;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  word-break: break-all;
}
.repo-expand-icon {
  cursor: pointer;
  font-size: 0.8rem;
  opacity: 0.6;
  flex-shrink: 0;
}
.repo-expand-icon:hover {
  opacity: 1;
}
.repo-private-icon {
  font-size: 0.75rem;
  opacity: 0.5;
}
.repo-actions {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
}
.repo-actions i,
.repo-actions a i {
  cursor: pointer;
  font-size: 1.1rem;
  opacity: 0.6;
}
.repo-actions i:hover,
.repo-actions a i:hover {
  opacity: 1;
}
.repo-actions a {
  text-decoration: none;
  color: inherit;
}

/* Repo Details */
.repo-details {
  margin-top: 0.5rem;
  border-top: 1px solid var(--pico-muted-border-color, #333);
  padding-top: 0.5rem;
}
.repo-details-loading {
  display: flex;
  justify-content: center;
  padding: 1rem;
}
.detail-section {
  margin-bottom: 0.75rem;
}
.detail-section h6 {
  margin: 0 0 0.3rem 0;
  font-size: 0.85rem;
  opacity: 0.8;
}
.detail-empty {
  font-size: 0.8rem;
  opacity: 0.5;
  font-style: italic;
}

/* PR Row */
.pr-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.25rem 0;
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
  font-size: 0.7rem;
  padding: 0.1em 0.4em;
  border-radius: 3px;
  font-weight: 600;
  text-transform: uppercase;
  flex-shrink: 0;
}
.pr-open {
  background: #2da44e;
  color: #fff;
}
.pr-closed {
  background: #8250df;
  color: #fff;
}
.pr-draft {
  background: #656d76;
  color: #fff;
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
  padding: 0.25rem 0;
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
  color: #d4920b;
}
.action-success {
  color: #2da44e;
}
.action-failure {
  color: #cf222e;
}
.action-unknown {
  color: #656d76;
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

@media (prefers-color-scheme: light) {
  .pr-open {
    background: #1a7f37;
  }
  .pr-closed {
    background: #6639ba;
  }
  .pr-draft {
    background: #59636e;
  }
  .action-success {
    color: #1a7f37;
  }
  .action-failure {
    color: #cf222e;
  }
  .action-pending {
    color: #9a6700;
  }
}
</style>
