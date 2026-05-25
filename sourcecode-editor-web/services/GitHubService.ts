import Config from "~~/services/Config";
import { AuthService } from "~~/services/AuthService";
import axios from "axios";

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  ssh_url: string;
  default_branch: string;
  owner: { login: string };
  private: boolean;
}

export interface GitHubPR {
  number: number;
  title: string;
  state: string;
  draft: boolean;
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  user: { login: string };
  html_url: string;
  created_at: string;
  mergeable: boolean | null;
}

export interface GitHubActionRun {
  id: number;
  name: string;
  head_branch: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  workflow_id: number;
}

export interface WatchedRepoEntry {
  org: string;
  repo: string;
  repoInfo: GitHubRepo | null;
  pulls: GitHubPR[];
  actions: GitHubActionRun[];
  branches: number;
  expanded: boolean;
  actionsExpanded: boolean;
}

export class GitHubService {
  static async isEnabled(): Promise<boolean> {
    const res = await axios.get(`${(await Config.get()).SERVER_URL}/github`, {
      ...(await AuthService.getAuthHeader()),
    });
    return res.data.enabled;
  }

  static async getWatchedRepos(): Promise<WatchedRepoEntry[]> {
    const res = await axios.get(
      `${(await Config.get()).SERVER_URL}/github/cache/watched`,
      await AuthService.getAuthHeader(),
    );
    return res.data.entries;
  }

  static async addWatchedRepo(org: string, repo: string): Promise<void> {
    await axios.post(
      `${(await Config.get()).SERVER_URL}/github/cache/watched`,
      { org, repo },
      await AuthService.getAuthHeader(),
    );
  }

  static async removeWatchedRepo(org: string, repo: string): Promise<void> {
    await axios.delete(
      `${(await Config.get()).SERVER_URL}/github/cache/watched/${org}/${repo}`,
      await AuthService.getAuthHeader(),
    );
  }

  static async refreshActions(org: string, repo: string): Promise<void> {
    await axios.post(
      `${(await Config.get()).SERVER_URL}/github/cache/actions/refresh/${org}/${repo}`,
      {},
      await AuthService.getAuthHeader(),
    );
  }

  static async getCachedPulls(
    owner: string,
    repo: string,
  ): Promise<GitHubPR[]> {
    const res = await axios.get(
      `${(await Config.get()).SERVER_URL}/github/cache/pulls/${owner}/${repo}`,
      await AuthService.getAuthHeader(),
    );
    return res.data.pulls;
  }

  static async getCachedActions(
    owner: string,
    repo: string,
  ): Promise<GitHubActionRun[]> {
    const res = await axios.get(
      `${(await Config.get()).SERVER_URL}/github/cache/actions/${owner}/${repo}`,
      await AuthService.getAuthHeader(),
    );
    return res.data.runs;
  }

  static async getCacheTimestamp(): Promise<number> {
    const res = await axios.get(
      `${(await Config.get()).SERVER_URL}/github/cache/timestamp`,
      await AuthService.getAuthHeader(),
    );
    return res.data.lastUpdated;
  }

  static async getPulls(owner: string, repo: string): Promise<GitHubPR[]> {
    const res = await axios.get(
      `${(await Config.get()).SERVER_URL}/github/repos/${owner}/${repo}/pulls`,
      await AuthService.getAuthHeader(),
    );
    return res.data.pulls;
  }

  static async getActions(
    owner: string,
    repo: string,
  ): Promise<GitHubActionRun[]> {
    const res = await axios.get(
      `${(await Config.get()).SERVER_URL}/github/repos/${owner}/${repo}/actions`,
      await AuthService.getAuthHeader(),
    );
    return res.data.runs;
  }

  static async createPR(
    owner: string,
    repo: string,
    title: string,
    head: string,
    base: string,
  ): Promise<void> {
    await axios.post(
      `${(await Config.get()).SERVER_URL}/github/repos/${owner}/${repo}/pulls`,
      { title, head, base },
      await AuthService.getAuthHeader(),
    );
  }

  static async mergePR(
    owner: string,
    repo: string,
    number: number,
  ): Promise<void> {
    await axios.post(
      `${(await Config.get()).SERVER_URL}/github/repos/${owner}/${repo}/pulls/${number}/merge`,
      {},
      await AuthService.getAuthHeader(),
    );
  }

  static async cloneRepo(owner: string, repo: string): Promise<void> {
    await axios.post(
      `${(await Config.get()).SERVER_URL}/github/repos/${owner}/${repo}/clone`,
      {},
      await AuthService.getAuthHeader(),
    );
  }
}
