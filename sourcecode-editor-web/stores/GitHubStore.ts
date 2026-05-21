import { defineStore } from "pinia";
import {
  GitHubService,
  type GitHubOrganizations,
  type GitHubRepo,
  type GitHubPR,
  type GitHubActionRun,
} from "~~/services/GitHubService";
import { handleError, EventBus, EventTypes } from "~~/services/EventBus";

interface RepoWithDetails {
  repo: GitHubRepo;
  pulls: GitHubPR[];
  actions: GitHubActionRun[];
  pullsLoading: boolean;
  actionsLoading: boolean;
  expanded: boolean;
}

interface OrgSection {
  repos: RepoWithDetails[];
  expanded: boolean;
}

export const GitHubStore = defineStore("GitHubStore", {
  state: () => ({
    enabled: false,
    organizations: {} as Record<string, OrgSection>,
    loading: false,
    initialized: false,
  }),

  getters: {
    orgNames(state): string[] {
      return Object.keys(state.organizations).sort();
    },
  },

  actions: {
    async init(): Promise<void> {
      if (this.initialized) return;
      this.initialized = true;
      try {
        this.enabled = await GitHubService.isEnabled();
      } catch {
        this.enabled = false;
      }
    },

    async fetchRepos(): Promise<void> {
      if (!this.enabled) return;
      this.loading = true;
      try {
        const orgs: GitHubOrganizations = await GitHubService.getRepos();
        const orgSections: Record<string, OrgSection> = {};
        for (const [orgName, repos] of Object.entries(orgs)) {
          orgSections[orgName] = {
            repos: repos.map((repo) => ({
              repo,
              pulls: [],
              actions: [],
              pullsLoading: false,
              actionsLoading: false,
              expanded: false,
            })),
            expanded: false,
          };
        }
        this.organizations = orgSections;
      } catch (err) {
        handleError(err);
      } finally {
        this.loading = false;
      }
    },

    async toggleOrg(orgName: string): Promise<void> {
      const org = this.organizations[orgName];
      if (!org) return;
      org.expanded = !org.expanded;
    },

    async toggleRepo(orgName: string, repoName: string): Promise<void> {
      const org = this.organizations[orgName];
      if (!org) return;
      const entry = org.repos.find((r) => r.repo.name === repoName);
      if (!entry) return;
      entry.expanded = !entry.expanded;
      if (entry.expanded) {
        if (entry.pulls.length === 0) {
          await this.fetchPulls(orgName, repoName);
        }
        if (entry.actions.length === 0) {
          await this.fetchActions(orgName, repoName);
        }
      }
    },

    async fetchPulls(orgName: string, repoName: string): Promise<void> {
      const org = this.organizations[orgName];
      if (!org) return;
      const entry = org.repos.find((r) => r.repo.name === repoName);
      if (!entry) return;
      entry.pullsLoading = true;
      try {
        entry.pulls = await GitHubService.getPulls(orgName, repoName);
      } catch (err) {
        handleError(err);
      } finally {
        entry.pullsLoading = false;
      }
    },

    async fetchActions(orgName: string, repoName: string): Promise<void> {
      const org = this.organizations[orgName];
      if (!org) return;
      const entry = org.repos.find((r) => r.repo.name === repoName);
      if (!entry) return;
      entry.actionsLoading = true;
      try {
        entry.actions = await GitHubService.getActions(orgName, repoName);
      } catch (err) {
        handleError(err);
      } finally {
        entry.actionsLoading = false;
      }
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
        // Refresh pulls
        await this.fetchPulls(orgName, repoName);
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
        // Refresh pulls
        await this.fetchPulls(orgName, repoName);
      } catch (err) {
        handleError(err);
      }
    },
  },
});
