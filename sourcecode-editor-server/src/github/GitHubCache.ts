import { Span } from "@opentelemetry/sdk-trace";
import * as fse from "fs-extra";
import * as path from "path";
import { Config, ConfigGitHubTokens } from "../Config";
import {
  GitHubGetRepoInfo,
  GitHubListPulls,
  GitHubGetLatestActions,
  GitHubGetPull,
  GitHubListBranches,
  GitHubSetTokens,
  GitHubIsEnabled,
  GitHubRepo,
  GitHubPR,
  GitHubActionRun,
} from "./GitHubApi";
import { DetectNewPulls, DetectDisappearedPulls, DetectNewFailedRuns } from "./GitHubChangeDetector";
import { getWatchedRepos, WatchedReposInit } from "./WatchedRepos";
import { OTelLogger, OTelTracer } from "../OTelContext";
import { EventBusEmit } from "../events/EventBus";
import { RepositoryEventTypes } from "../events/RepositoryEventTypes";

const logger = OTelLogger().createModuleLogger("GitHubCache");

let config: Config;
let cacheDir: string;

async function readJsonOrNull<T>(filePath: string): Promise<T | null> {
  try {
    return (await fse.readJson(filePath)) as T;
  } catch {
    return null;
  }
}

async function emitFailedRuns(
  org: string,
  repo: string,
  previous: GitHubActionRun[] | null,
  next: GitHubActionRun[],
): Promise<void> {
  for (const run of DetectNewFailedRuns(previous, next)) {
    EventBusEmit({
      repository: `${org}/${repo}`,
      eventType: RepositoryEventTypes.GITHUB_ACTIONS_FAILED,
      eventDetail: {
        org,
        repo,
        run: {
          id: run.id,
          name: run.name,
          html_url: run.html_url,
          conclusion: run.conclusion,
          head_branch: run.head_branch,
        },
      },
    });
  }
}

async function emitPullChanges(
  org: string,
  repo: string,
  previous: GitHubPR[] | null,
  next: GitHubPR[],
): Promise<void> {
  const key = `${org}/${repo}`;
  for (const pull of DetectNewPulls(previous, next)) {
    EventBusEmit({
      repository: key,
      eventType: RepositoryEventTypes.GITHUB_PR_OPENED,
      eventDetail: {
        org,
        repo,
        pull: {
          number: pull.number,
          title: pull.title,
          html_url: pull.html_url,
          user: pull.user?.login,
        },
      },
    });
  }
  for (const pull of DetectDisappearedPulls(previous, next)) {
    // Best-effort lookup to distinguish merged from closed.
    try {
      const full = await GitHubGetPull(org, repo, pull.number);
      EventBusEmit({
        repository: key,
        eventType:
          full.merged === true
            ? RepositoryEventTypes.GITHUB_PR_MERGED
            : RepositoryEventTypes.GITHUB_PR_CLOSED,
        eventDetail: {
          org,
          repo,
          pull: {
            number: full.number,
            title: full.title,
            html_url: full.html_url,
          },
        },
      });
    } catch (err) {
      logger.warn(
        `Could not resolve outcome of PR #${pull.number} in ${key}: ${err.message}`,
      );
    }
  }
}

export async function GitHubCacheInit(
  context: Span,
  configIn: Config,
): Promise<void> {
  const span = OTelTracer().startSpan("GitHubCacheInit", context);
  config = configIn;
  cacheDir = path.join(config.DATA_DIR, "github");

  WatchedReposInit(config);

  // Sync tokens from config
  GitHubSetTokens(ConfigGitHubTokens(config));

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

    const pullsDir = path.join(cacheDir, "pulls");
    const actionsDir = path.join(cacheDir, "actions");
    const branchesDir = path.join(cacheDir, "branches");
    const reposDir = path.join(cacheDir, "repos");
    await fse.ensureDir(reposDir);

    for (const watched of watchedRepos) {
      const { org: orgName, repo: repoName } = watched;
      const key = `${orgName}/${repoName}`;

      // Fetch repo info from GitHub API
      let repoInfo: GitHubRepo | null = null;
      try {
        repoInfo = await GitHubGetRepoInfo(orgName, repoName);
        await fse.ensureDir(path.join(reposDir, orgName));
        await fse.writeJson(
          path.join(reposDir, orgName, `${repoName}.json`),
          repoInfo,
          { spaces: 2 },
        );
      } catch (err) {
        logger.warn(
          `Watched repo not found on GitHub: ${key}: ${err.message}`,
          span,
        );
        continue;
      }

      await fse.ensureDir(path.join(pullsDir, orgName));
      await fse.ensureDir(path.join(actionsDir, orgName));
      await fse.ensureDir(path.join(branchesDir, orgName));

      // Fetch PRs
      try {
        const pullsPath = path.join(pullsDir, orgName, `${repoName}.json`);
        const previousPulls = await readJsonOrNull<GitHubPR[]>(pullsPath);
        const pulls = await GitHubListPulls(orgName, repoName);
        await emitPullChanges(orgName, repoName, previousPulls, pulls);
        await fse.writeJson(pullsPath, pulls, { spaces: 2 });
      } catch (err) {
        logger.warn(`Failed to fetch PRs for ${key}: ${err.message}`, span);
      }

      // Fetch Actions
      try {
        const actionsPath = path.join(actionsDir, orgName, `${repoName}.json`);
        const previousActions = await readJsonOrNull<GitHubActionRun[]>(
          actionsPath,
        );
        const actions = await GitHubGetLatestActions(orgName, repoName);
        await emitFailedRuns(orgName, repoName, previousActions, actions);
        await fse.writeJson(actionsPath, actions, { spaces: 2 });
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
    }

    // Write cache metadata
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

    logger.info(`GitHub cache refreshed: ${watchedRepos.length} repos`, span);
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
      const actionsPath = path.join(cacheDir, "actions", org, `${repo}.json`);
      const previousActions = await readJsonOrNull<GitHubActionRun[]>(
        actionsPath,
      );
      const actions = await GitHubGetLatestActions(org, repo);
      await emitFailedRuns(org, repo, previousActions, actions);
      await fse.writeJson(actionsPath, actions, { spaces: 2 });
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
