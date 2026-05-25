import * as fse from "fs-extra";
import * as path from "path";
import { ObservableGauge } from "@opentelemetry/api";
import { Span } from "@opentelemetry/sdk-trace-base";
import { Config } from "../Config";
import { OTelLogger, OTelMeter, OTelTracer } from "../OTelContext";
import type { GitHubPR, GitHubActionRun } from "./GitHubApi";

const logger = OTelLogger().createModuleLogger("GitHubMetrics");

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let pullsPerRepoGauge: ObservableGauge;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let actionsSuccessRateGauge: ObservableGauge;

let githubCacheDir: string;

export async function GitHubMetricsInit(
  context: Span,
  config: Config,
): Promise<void> {
  const span = OTelTracer().startSpan("GitHubMetricsInit", context);
  githubCacheDir = path.join(config.DATA_DIR, "github");
  const meter = OTelMeter();

  // ObservableGauge: open pull requests per repository
  pullsPerRepoGauge = meter.createObservableGauge(
    "github.pulls.per_repo",
    async (observableResult) => {
      try {
        const pullsDir = path.join(githubCacheDir, "pulls");
        if (!(await fse.pathExists(pullsDir))) return;
        const orgDirs = await fse.readdir(pullsDir);
        for (const orgName of orgDirs) {
          const orgPath = path.join(pullsDir, orgName);
          const stat = await fse.stat(orgPath);
          if (!stat.isDirectory()) continue;
          const repoFiles = await fse.readdir(orgPath);
          for (const repoFile of repoFiles) {
            if (!repoFile.endsWith(".json")) continue;
            try {
              const pulls: GitHubPR[] = await fse.readJson(
                path.join(orgPath, repoFile),
              );
              const openCount = pulls.filter(
                (p) => p.state === "open" && !p.draft,
              ).length;
              const repoName = repoFile.replace(/\.json$/, "");
              observableResult.observe(openCount, {
                org: orgName,
                repo: repoName,
              });
            } catch {
              // skip bad files
            }
          }
        }
      } catch (err) {
        logger.error("Failed to observe pulls per repo", err);
      }
    },
    "Number of open (non-draft) pull requests per repository",
  );

  // ObservableGauge: success rate of actions per repository
  actionsSuccessRateGauge = meter.createObservableGauge(
    "github.actions.success_rate",
    async (observableResult) => {
      try {
        const actionsDir = path.join(githubCacheDir, "actions");
        if (!(await fse.pathExists(actionsDir))) return;
        const orgDirs = await fse.readdir(actionsDir);
        for (const orgName of orgDirs) {
          const orgPath = path.join(actionsDir, orgName);
          const stat = await fse.stat(orgPath);
          if (!stat.isDirectory()) continue;
          const repoFiles = await fse.readdir(orgPath);
          for (const repoFile of repoFiles) {
            if (!repoFile.endsWith(".json")) continue;
            try {
              const runs: GitHubActionRun[] = await fse.readJson(
                path.join(orgPath, repoFile),
              );
              const completed = runs.filter((r) => r.status === "completed");
              const successful = completed.filter(
                (r) => r.conclusion === "success",
              );
              const rate =
                completed.length > 0
                  ? Math.round((successful.length / completed.length) * 100)
                  : 0;
              const repoName = repoFile.replace(/\.json$/, "");
              observableResult.observe(rate, {
                org: orgName,
                repo: repoName,
              });
            } catch {
              // skip bad files
            }
          }
        }
      } catch (err) {
        logger.error("Failed to observe actions success rate", err);
      }
    },
    "Percentage of completed workflow runs that were successful per repository",
  );

  span.end();
}
