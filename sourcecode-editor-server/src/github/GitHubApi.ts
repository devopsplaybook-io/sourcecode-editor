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

let tokens: string[] = [];

export function GitHubSetTokens(newTokens: string[]): void {
  tokens = newTokens;
}

export function GitHubIsEnabled(): boolean {
  return tokens.length > 0;
}

function apiHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "sourcecode-editor",
  };
}

// Remembers which token last succeeded for an owner, so repo-scoped calls
// stop probing tokens that cannot access it.
const ownerTokenCache = new Map<string, string>();

function isTokenError(err: unknown): boolean {
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status === 401 || status === 403 || status === 404;
}

/**
 * Run `op` with a token that can access `owner`. Tries the cached token for
 * the owner first, then the remaining tokens in order. Only auth/permission/
 * not-found errors trigger a fallback; other failures propagate immediately.
 * On success the winning token is cached for the owner.
 */
async function withOwnerToken<T>(
  owner: string,
  op: (token: string) => Promise<T>,
): Promise<T> {
  const candidates: string[] = [];
  const cached = ownerTokenCache.get(owner);
  if (cached) {
    candidates.push(cached);
  }
  for (const token of tokens) {
    if (token !== cached) {
      candidates.push(token);
    }
  }

  let lastErr: unknown;
  for (const token of candidates) {
    try {
      const result = await op(token);
      ownerTokenCache.set(owner, token);
      return result;
    } catch (err) {
      lastErr = err;
      if (!isTokenError(err)) {
        throw err;
      }
    }
  }
  if (candidates.length === 0) {
    throw new Error(`No GitHub tokens configured for ${owner}`);
  }
  if (candidates.length > 1) {
    logger.warn(`No configured GitHub token could access ${owner}`);
  }
  throw lastErr;
}

export async function GitHubGetRepoInfo(
  owner: string,
  repo: string,
): Promise<GitHubRepo> {
  return withOwnerToken(owner, async (token) => {
    const res = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: apiHeaders(token),
      },
    );
    return res.data as GitHubRepo;
  });
}

export async function GitHubListRepos(): Promise<GitHubOrganizations> {
  const orgs: GitHubOrganizations = {};
  const seenRepoIds = new Set<number>();

  for (const token of tokens) {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const res = await axios.get("https://api.github.com/user/repos", {
        headers: apiHeaders(token),
        params: { per_page: 100, page, sort: "full_name", type: "all" },
      });
      const repos = res.data as GitHubRepo[];
      if (repos.length === 0) {
        hasMore = false;
      } else {
        for (const repo of repos) {
          // A repo visible to several tokens must appear only once.
          if (seenRepoIds.has(repo.id)) {
            continue;
          }
          seenRepoIds.add(repo.id);
          const orgName = repo.owner.login;
          if (!orgs[orgName]) {
            orgs[orgName] = [];
          }
          orgs[orgName].push(repo);
        }
        page++;
      }
    }
  }

  return orgs;
}

export async function GitHubListPulls(
  owner: string,
  repo: string,
): Promise<GitHubPR[]> {
  return withOwnerToken(owner, async (token) => {
    const res = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        headers: apiHeaders(token),
        params: { state: "open", per_page: 20 },
      },
    );
    return res.data as GitHubPR[];
  });
}

export async function GitHubGetLatestActions(
  owner: string,
  repo: string,
): Promise<GitHubActionRun[]> {
  return withOwnerToken(owner, async (token) => {
    const res = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/actions/runs`,
      {
        headers: apiHeaders(token),
        params: { per_page: 5, page: 1 },
      },
    );
    return res.data.workflow_runs as GitHubActionRun[];
  });
}

export async function GitHubListBranches(
  owner: string,
  repo: string,
): Promise<number> {
  try {
    return await withOwnerToken(owner, async (token) => {
      const res = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/branches`,
        {
          headers: apiHeaders(token),
          params: { per_page: 100 },
        },
      );
      const branches = res.data as { name: string }[];
      return branches.length;
    });
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
  await withOwnerToken(owner, async (token) => {
    await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      { title, head, base },
      { headers: apiHeaders(token) },
    );
  });
}

export async function GitHubMergePull(
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<void> {
  await withOwnerToken(owner, async (token) => {
    await axios.put(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/merge`,
      {},
      { headers: apiHeaders(token) },
    );
  });
}
