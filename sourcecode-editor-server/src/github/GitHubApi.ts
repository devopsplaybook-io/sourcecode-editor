import axios from "axios";
import { OTelLogger } from "../OTelContext";

const logger = OTelLogger().createModuleLogger("GitHubApi");

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  ssh_url: string;
  clone_url: string;
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

export type GitHubOrganizations = Record<string, GitHubRepo[]>;

let token = "";

export function GitHubSetToken(newToken: string): void {
  token = newToken;
}

export function GitHubIsEnabled(): boolean {
  return token.length > 0;
}

function apiHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "sourcecode-editor",
  };
}

export async function GitHubGetRepoInfo(
  owner: string,
  repo: string,
): Promise<GitHubRepo> {
  const res = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: apiHeaders(),
  });
  return res.data as GitHubRepo;
}

export async function GitHubListRepos(): Promise<GitHubOrganizations> {
  const orgs: GitHubOrganizations = {};
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await axios.get("https://api.github.com/user/repos", {
      headers: apiHeaders(),
      params: { per_page: 100, page, sort: "full_name", type: "all" },
    });
    const repos = res.data as GitHubRepo[];
    if (repos.length === 0) {
      hasMore = false;
    } else {
      for (const repo of repos) {
        const orgName = repo.owner.login;
        if (!orgs[orgName]) {
          orgs[orgName] = [];
        }
        orgs[orgName].push(repo);
      }
      page++;
    }
  }

  return orgs;
}

export async function GitHubListPulls(
  owner: string,
  repo: string,
): Promise<GitHubPR[]> {
  const res = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/pulls`,
    {
      headers: apiHeaders(),
      params: { state: "open", per_page: 20 },
    },
  );
  return res.data as GitHubPR[];
}

export async function GitHubGetLatestActions(
  owner: string,
  repo: string,
): Promise<GitHubActionRun[]> {
  const res = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/actions/runs`,
    {
      headers: apiHeaders(),
      params: { per_page: 5, page: 1 },
    },
  );
  return res.data.workflow_runs as GitHubActionRun[];
}

export async function GitHubListBranches(
  owner: string,
  repo: string,
): Promise<number> {
  try {
    const res = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/branches`,
      {
        headers: apiHeaders(),
        params: { per_page: 100 },
      },
    );
    const branches = res.data as { name: string }[];
    return branches.length;
  } catch (err) {
    logger.warn(`Failed to list branches for ${owner}/${repo}: ${err.message}`);
    return 0;
  }
}

export async function GitHubCreatePull(
  owner: string,
  repo: string,
  title: string,
  head: string,
  base: string,
): Promise<void> {
  await axios.post(
    `https://api.github.com/repos/${owner}/${repo}/pulls`,
    { title, head, base },
    { headers: apiHeaders() },
  );
}

export async function GitHubMergePull(
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<void> {
  await axios.put(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/merge`,
    {},
    { headers: apiHeaders() },
  );
}
