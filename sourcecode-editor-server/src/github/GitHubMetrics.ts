import * as fse from "fs-extra";
import * as path from "path";
import { Counter, ObservableGauge } from "@opentelemetry/api";
import { Span } from "@opentelemetry/sdk-trace-base";
import { Config } from "../Config";
import { OTelLogger, OTelMeter, OTelTracer } from "../OTelContext";
import { GitHubOrganizations } from "./GitHubApi";
import type { GitHubPR, GitHubActionRun } from "./GitHubApi";

const logger = OTelLogger().createModuleLogger("GitHubMetrics");

let reposTotalGauge: ObservableGauge;
let pullsOpenGauge: ObservableGauge;
let pullsDraftGauge: ObservableGauge;
let actionsPendingGauge: ObservableGauge;
let actionsCompletedCounter: Counter;
let actionsDailyGauge: ObservableGauge;

let githubCacheDir: string;

export async function GitHubMetricsInit(
  context: Span,
  config: Config,
): Promise<void> {
  const span = OTelTracer().startSpan("GitHubMetricsInit", context);
  githubCacheDir = path.join(config.DATA_DIR, "github");
  const meter = OTelMeter();

  // ObservableGauge: total repos by org
  reposTotalGauge = meter.createObservableGauge(
    "github.repos.total",
    async (observableResult) => {
      try {
        const reposPath = path.join(githubCacheDir, "repos.json");
        if (!(await fse.pathExists(reposPath))) return;
        const orgs: GitHubOrganizations = await fse.readJson(reposPath);
        for (const [orgName, repos] of Object.entries(orgs)) {
          observableResult.observe(repos.length, {
            org: orgName,
            metric: "repos.total",
          });
        }
      } catch (err) {
        logger.error("Failed to observe repos total", err);
      }
    },
    "Total number of GitHub repositories per organization",
  );

  // ObservableGauge: open PRs by org/repo
  pullsOpenGauge = meter.createObservableGauge(
    "github.pulls.open",
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
                metric: "pulls.open",
              });
            } catch {
              // skip bad files
            }
          }
        }
      } catch (err) {
        logger.error("Failed to observe pulls open", err);
      }
    },
    "Number of open (non-draft) pull requests per repository",
  );

  // ObservableGauge: draft PRs by org/repo
  pullsDraftGauge = meter.createObservableGauge(
    "github.pulls.draft",
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
              const draftCount = pulls.filter((p) => p.draft).length;
              const repoName = repoFile.replace(/\.json$/, "");
              observableResult.observe(draftCount, {
                org: orgName,
                repo: repoName,
                metric: "pulls.draft",
              });
            } catch {
              // skip bad files
            }
          }
        }
      } catch (err) {
        logger.error("Failed to observe pulls draft", err);
      }
    },
    "Number of draft pull requests per repository",
  );

  // ObservableGauge: pending actions by org/repo
  actionsPendingGauge = meter.createObservableGauge(
    "github.actions.pending",
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
              const pendingCount = runs.filter(
                (r) =>
                  r.status === "in_progress" ||
                  r.status === "queued" ||
                  r.status === "pending",
              ).length;
              const repoName = repoFile.replace(/\.json$/, "");
              observableResult.observe(pendingCount, {
                org: orgName,
                repo: repoName,
                metric: "actions.pending",
              });
            } catch {
              // skip bad files
            }
          }
        }
      } catch (err) {
        logger.error("Failed to observe actions pending", err);
      }
    },
    "Number of in-progress or queued workflow runs per repository",
  );

  // Counter: completed action runs with conclusion label
  actionsCompletedCounter = meter.createCounter("github.actions.completed");

  // ObservableGauge: total action runs today by org/repo
  actionsDailyGauge = meter.createObservableGauge(
    "github.actions.daily",
    async (observableResult) => {
      try {
        const actionsDir = path.join(githubCacheDir, "actions");
        if (!(await fse.pathExists(actionsDir))) return;
        const orgDirs = await fse.readdir(actionsDir);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayTs = todayStart.getTime();

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
              const todayCount = runs.filter((r) => {
                const rTs = new Date(r.created_at).getTime();
                return rTs >= todayTs;
              }).length;
              const repoName = repoFile.replace(/\.json$/, "");
              observableResult.observe(todayCount, {
                org: orgName,
                repo: repoName,
                metric: "actions.daily",
              });
            } catch {
              // skip bad files
            }
          }
        }
      } catch (err) {
        logger.error("Failed to observe actions daily", err);
      }
    },
    "Number of workflow runs created today per repository",
  );

  span.end();
}
