import { Span } from "@opentelemetry/sdk-trace-base";
import * as fse from "fs-extra";
import * as path from "path";
import { Config } from "../Config";
import { OTelMeter, OTelTracer, OTelLogger } from "../OTelContext";
import { getWatchedRepos, WatchedReposInit } from "./WatchedRepos";
import { GitHubSetToken, GitHubIsEnabled } from "./GitHubApi";

const logger = OTelLogger().createModuleLogger("GitHubMetrics");

// Stats objects updated periodically from cached GitHub data.
const statsActionsSuccessRate: Record<string, number> = {};
const statsPRCount: Record<string, number> = {};
const statsBranchCount: Record<string, number> = {};

let config: Config;
let cacheDir: string;

export async function GitHubMetricsInit(
  context: Span,
  configIn: Config,
): Promise<void> {
  const span = OTelTracer().startSpan("GitHubMetricsInit", context);
  config = configIn;
  cacheDir = path.join(config.DATA_DIR, "github");

  WatchedReposInit(config);

  if (config.GITHUB_TOKEN) {
    GitHubSetToken(config.GITHUB_TOKEN);
  }

  const meter = OTelMeter();

  // GitHub Actions Success Rate: for each watched repo, the fraction of completed
  // workflow runs that concluded with "success".
  meter.createObservableGauge(
    "github.actions.success.rate",
    (observableResult) => {
      for (const [key, rate] of Object.entries(statsActionsSuccessRate)) {
        const [org, repo] = key.split("/");
        observableResult.observe(rate, { org, repo });
      }
    },
    "GitHub Actions success rate per watched repo",
  );

  // GitHub Open PR Count: number of open pull requests per watched repo.
  meter.createObservableGauge(
    "github.prs.open",
    (observableResult) => {
      for (const [key, count] of Object.entries(statsPRCount)) {
        const [org, repo] = key.split("/");
        observableResult.observe(count, { org, repo });
      }
    },
    "Number of open pull requests per watched repo",
  );

  // GitHub Branches Count: number of branches per watched repo.
  meter.createObservableGauge(
    "github.branches",
    (observableResult) => {
      for (const [key, count] of Object.entries(statsBranchCount)) {
        const [org, repo] = key.split("/");
        observableResult.observe(count, { org, repo });
      }
    },
    "Number of branches per watched repo",
  );

  // Periodic stats update matching the GitHub cache refresh frequency.
  setInterval(() => {
    GitHubMetricsUpdateStats().catch((err) =>
      logger.error("GitHubMetricsUpdateStats failed", err),
    );
  }, config.GITHUB_SYNC_FREQUENCY);

  // Initial stats update.
  await GitHubMetricsUpdateStats();

  span.end();
}

/**
 * Read the cached GitHub data and refresh the in-memory stats objects.
 */
async function GitHubMetricsUpdateStats(): Promise<void> {
  // Clear stale entries before repopulating.
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  Object.keys(statsActionsSuccessRate).forEach((k) => delete statsActionsSuccessRate[k]);
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  Object.keys(statsPRCount).forEach((k) => delete statsPRCount[k]);
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  Object.keys(statsBranchCount).forEach((k) => delete statsBranchCount[k]);

  if (!GitHubIsEnabled()) {
    return;
  }

  const watchedRepos = await getWatchedRepos();

  for (const { org, repo } of watchedRepos) {
    const key = `${org}/${repo}`;

    // Actions success rate
    try {
      const actionsPath = path.join(cacheDir, "actions", org, `${repo}.json`);
      if (await fse.pathExists(actionsPath)) {
        const actions = (await fse.readJson(actionsPath)) as {
          conclusion: string | null;
        }[];
        const completed = actions.filter((a) => a.conclusion !== null);
        statsActionsSuccessRate[key] =
          completed.length > 0
            ? completed.filter((a) => a.conclusion === "success").length /
              completed.length
            : 0;
      }
    } catch (err) {
      logger.warn(`Failed to read actions for ${key}`, err);
    }

    // PR count
    try {
      const pullsPath = path.join(cacheDir, "pulls", org, `${repo}.json`);
      if (await fse.pathExists(pullsPath)) {
        const pulls = (await fse.readJson(pullsPath)) as unknown[];
        statsPRCount[key] = pulls.length;
      }
    } catch (err) {
      logger.warn(`Failed to read PRs for ${key}`, err);
    }

    // Branches count
    try {
      const branchesPath = path.join(cacheDir, "branches", org, `${repo}.json`);
      if (await fse.pathExists(branchesPath)) {
        const branchData = (await fse.readJson(branchesPath)) as {
          count: number;
        };
        statsBranchCount[key] = branchData.count || 0;
      }
    } catch (err) {
      logger.warn(`Failed to read branches for ${key}`, err);
    }
  }
}
