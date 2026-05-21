import { Span } from "@opentelemetry/sdk-trace-base";
import * as fse from "fs-extra";
import * as path from "path";
import { Config } from "../Config";
import {
  GitHubListRepos,
  GitHubListPulls,
  GitHubGetLatestActions,
  GitHubSetToken,
  GitHubIsEnabled,
  GitHubOrganizations,
} from "./GitHubApi";
import { OTelLogger, OTelTracer } from "../OTelContext";
import { EventBusEmit } from "../events/EventBus";
import { RepositoryEventTypes } from "../events/RepositoryEventTypes";

const logger = OTelLogger().createModuleLogger("GitHubCache");

export interface ActivityEntry {
  org: string;
  repo: string;
  lastActivity: number; // epoch ms
  lastPrCreated: number;
  lastActionUpdated: number;
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

  // Sync token from config
  if (config.GITHUB_TOKEN) {
    GitHubSetToken(config.GITHUB_TOKEN);
  }

  // Initial cache refresh after startup
  await GitHubCacheRefresh(span);

  // Periodic refresh
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
    // Ensure cache directory exists
    await fse.ensureDir(cacheDir);
    await fse.ensureDir(path.join(cacheDir, "pulls"));
    await fse.ensureDir(path.join(cacheDir, "actions"));

    // 1. Fetch all repos
    logger.info("Fetching GitHub repos...", span);
    const orgs: GitHubOrganizations = await GitHubListRepos();
    await fse.writeJson(path.join(cacheDir, "repos.json"), orgs, { spaces: 2 });

    const activityEntries: ActivityEntry[] = [];
    const pullsDir = path.join(cacheDir, "pulls");
    const actionsDir = path.join(cacheDir, "actions");

    // 2. For each org/repo, fetch PRs and actions
    for (const [orgName, repos] of Object.entries(orgs)) {
      await fse.ensureDir(path.join(pullsDir, orgName));
      await fse.ensureDir(path.join(actionsDir, orgName));

      for (const repo of repos) {
        const repoName = repo.name;
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
          logger.warn(
            `Failed to fetch PRs for ${orgName}/${repoName}: ${err.message}`,
            span,
          );
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
          logger.warn(
            `Failed to fetch actions for ${orgName}/${repoName}: ${err.message}`,
            span,
          );
        }

        entry.lastActivity = Math.max(
          entry.lastPrCreated,
          entry.lastActionUpdated,
        );
        activityEntries.push(entry);
      }
    }

    // 3. Write activity and meta data
    await fse.writeJson(path.join(cacheDir, "activity.json"), activityEntries, {
      spaces: 2,
    });
    await fse.writeJson(
      path.join(cacheDir, "meta.json"),
      { lastUpdated: Date.now() },
      { spaces: 2 },
    );

    // 4. Emit event so WebSocket subscribers know cache is fresh
    EventBusEmit({
      repository: "*",
      eventType: RepositoryEventTypes.GITHUB_CACHE_UPDATED,
      eventDetail: { ts: Date.now() },
    });

    logger.info(
      `GitHub cache refreshed: ${Object.keys(orgs).length} orgs, ${activityEntries.length} repos`,
      span,
    );
  } catch (err) {
    logger.error("GitHub cache refresh failed", err, span);
  }
  span.end();
}
