import { Span } from "@opentelemetry/sdk-trace-base";
import * as fse from "fs-extra";
import * as path from "path";
import { Config } from "../Config";
import {
  GitHubListRepos,
  GitHubListPulls,
  GitHubGetLatestActions,
  GitHubListBranches,
  GitHubSetToken,
  GitHubIsEnabled,
  GitHubOrganizations,
  GitHubRepo,
} from "./GitHubApi";
import { getWatchedRepos, WatchedReposInit } from "./WatchedRepos";
import { GitHubPR, GitHubActionRun } from "./GitHubApi";
import { OTelLogger, OTelTracer } from "../OTelContext";
import { EventBusEmit } from "../events/EventBus";
import { RepositoryEventTypes } from "../events/RepositoryEventTypes";

const logger = OTelLogger().createModuleLogger("GitHubCache");

export interface ActivityEntry {
  org: string;
  repo: string;
  lastActivity: number;
  lastPrCreated: number;
  lastActionUpdated: number;
}

export interface CachedRepoData {
  repo: GitHubRepo;
  pulls: GitHubPR[];
  actions: GitHubActionRun[];
  branches: number;
}

let config: Config;
let cacheDir: string;

export async function GitHubCacheInit(
  context: Span,
  configIn: Config,
): Promise<void> {
  const span = OTelTracer().startSpan("GitHubCacheInit", context);
  config = configIn;
  cacheDir = path.join(config.DATA_DIR, "github");

  WatchedReposInit(config);

  // Sync token from config
  if (config.GITHUB_TOKEN) {
    GitHubSetToken(config.GITHUB_TOKEN);
  }

  // Initial cache refresh after startup
  await GitHubCacheRefresh(span);

  // Periodic refresh for watched repos
  setInterval(() => {
    const refreshSpan = OTelTracer().startSpan("GitHubCacheInterval");
    GitHubCacheRefresh(refreshSpan).finally(() => refreshSpan.end());
  }, config.GITHUB_SYNC_FREQUENCY);

  span.end();
}

export async function GitHubCacheRefresh(context: Span): Promise<void> {
  const span = OTelTracer().startSpan("GitHubCacheRefresh", context);

  if (!GitHubIsEnabled()) {
    logger.info("GitHub not enabled, skipping cache refresh", span);
    span.end();
    return;
  }

  try {
    await fse.ensureDir(cacheDir);
    await fse.ensureDir(path.join(cacheDir, "pulls"));
    await fse.ensureDir(path.join(cacheDir, "actions"));
    await fse.ensureDir(path.join(cacheDir, "branches"));

    const watchedRepos = await getWatchedRepos();
    if (watchedRepos.length === 0) {
      logger.info("No watched repos, skipping cache refresh", span);
      // Write empty repos data
      await fse.writeJson(path.join(cacheDir, "repos.json"), {}, { spaces: 2 });
      await fse.writeJson(
        path.join(cacheDir, "meta.json"),
        { lastUpdated: Date.now() },
        { spaces: 2 },
      );
      span.end();
      return;
    }

    logger.info(
      `Fetching GitHub data for ${watchedRepos.length} watched repos...`,
      span,
    );

    // Build org -> repos map for cached repo data
    const orgs: GitHubOrganizations = {};
    // We need to fetch actual repo info - first get all user repos to find matching ones
    const allRepos = await GitHubListRepos();

    // Build a lookup from "org/repo" -> GitHubRepo
    const repoLookup: Record<string, GitHubRepo> = {};
    for (const [orgName, repos] of Object.entries(allRepos)) {
      for (const repo of repos) {
        repoLookup[`${orgName}/${repo.name}`] = repo;
      }
    }

    const activityEntries: ActivityEntry[] = [];
    const pullsDir = path.join(cacheDir, "pulls");
    const actionsDir = path.join(cacheDir, "actions");
    const branchesDir = path.join(cacheDir, "branches");

    for (const watched of watchedRepos) {
      const { org: orgName, repo: repoName } = watched;
      const key = `${orgName}/${repoName}`;
      const repoInfo = repoLookup[key];

      if (!repoInfo) {
        logger.warn(`Watched repo not found on GitHub: ${key}`, span);
        continue;
      }

      if (!orgs[orgName]) {
        orgs[orgName] = [];
      }
      orgs[orgName].push(repoInfo);

      await fse.ensureDir(path.join(pullsDir, orgName));
      await fse.ensureDir(path.join(actionsDir, orgName));
      await fse.ensureDir(path.join(branchesDir, orgName));

      const entry: ActivityEntry = {
        org: orgName,
        repo: repoName,
        lastActivity: 0,
        lastPrCreated: 0,
        lastActionUpdated: 0,
      };

      // Fetch PRs
      try {
        const pulls = await GitHubListPulls(orgName, repoName);
        await fse.writeJson(
          path.join(pullsDir, orgName, `${repoName}.json`),
          pulls,
          { spaces: 2 },
        );
        for (const pr of pulls) {
          const prTs = new Date(pr.created_at).getTime();
          if (prTs > entry.lastPrCreated) {
            entry.lastPrCreated = prTs;
          }
        }
      } catch (err) {
        logger.warn(`Failed to fetch PRs for ${key}: ${err.message}`, span);
      }

      // Fetch Actions
      try {
        const actions = await GitHubGetLatestActions(orgName, repoName);
        await fse.writeJson(
          path.join(actionsDir, orgName, `${repoName}.json`),
          actions,
          { spaces: 2 },
        );
        for (const action of actions) {
          const actionTs = new Date(action.updated_at).getTime();
          if (actionTs > entry.lastActionUpdated) {
            entry.lastActionUpdated = actionTs;
          }
        }
      } catch (err) {
        logger.warn(`Failed to fetch actions for ${key}: ${err.message}`, span);
      }

      // Fetch Branches count
      try {
        const branchCount = await GitHubListBranches(orgName, repoName);
        await fse.writeJson(
          path.join(branchesDir, orgName, `${repoName}.json`),
          { count: branchCount },
          { spaces: 2 },
        );
      } catch (err) {
        logger.warn(
          `Failed to fetch branches for ${key}: ${err.message}`,
          span,
        );
      }

      entry.lastActivity = Math.max(
        entry.lastPrCreated,
        entry.lastActionUpdated,
      );
      activityEntries.push(entry);
    }

    // Write cached data
    await fse.writeJson(path.join(cacheDir, "repos.json"), orgs, {
      spaces: 2,
    });
    await fse.writeJson(path.join(cacheDir, "activity.json"), activityEntries, {
      spaces: 2,
    });
    await fse.writeJson(
      path.join(cacheDir, "meta.json"),
      { lastUpdated: Date.now() },
      { spaces: 2 },
    );

    // Emit event so WebSocket subscribers know cache is fresh
    EventBusEmit({
      repository: "*",
      eventType: RepositoryEventTypes.GITHUB_CACHE_UPDATED,
      eventDetail: { ts: Date.now() },
    });

    logger.info(
      `GitHub cache refreshed: ${Object.keys(orgs).length} orgs, ${watchedRepos.length} repos`,
      span,
    );
  } catch (err) {
    logger.error("GitHub cache refresh failed", err, span);
  }
  span.end();
}

export async function GitHubCacheRefreshSingle(
  org: string,
  repo: string,
): Promise<void> {
  const span = OTelTracer().startSpan("GitHubCacheRefreshSingle");

  if (!GitHubIsEnabled()) {
    span.end();
    return;
  }

  try {
    await fse.ensureDir(cacheDir);
    await fse.ensureDir(path.join(cacheDir, "actions"));
    await fse.ensureDir(path.join(cacheDir, "actions", org));

    // Refresh actions only for the single repo
    try {
      const actions = await GitHubGetLatestActions(org, repo);
      await fse.writeJson(
        path.join(cacheDir, "actions", org, `${repo}.json`),
        actions,
        { spaces: 2 },
      );
      logger.info(`Refreshed actions for ${org}/${repo}`, span);
    } catch (err) {
      logger.error(`Failed to refresh actions for ${org}/${repo}`, err, span);
    }

    EventBusEmit({
      repository: `${org}/${repo}`,
      eventType: RepositoryEventTypes.GITHUB_CACHE_UPDATED,
      eventDetail: { ts: Date.now() },
    });
  } catch (err) {
    logger.error("GitHub cache single refresh failed", err, span);
  }
  span.end();
}
