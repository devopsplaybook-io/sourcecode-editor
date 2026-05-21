import { Counter, ObservableGauge } from "@opentelemetry/api";
import { Span } from "@opentelemetry/sdk-trace-base";
import { OTelLogger, OTelMeter, OTelTracer } from "../OTelContext";
import { ProjectsDataList } from "../projects/ProjectsData";

const logger = OTelLogger().createModuleLogger("SourceCodeMetrics");

let projectsTotalGauge: ObservableGauge;
let branchesTotalGauge: ObservableGauge;
let filesModifiedGauge: ObservableGauge;
let commitsCounter: Counter;

export async function SourceCodeMetricsInit(context: Span): Promise<void> {
  const span = OTelTracer().startSpan("SourceCodeMetricsInit", context);
  const meter = OTelMeter();

  // ObservableGauge: total number of projects
  projectsTotalGauge = meter.createObservableGauge(
    "sourcecode.projects.total",
    async (observableResult) => {
      try {
        const projects = await ProjectsDataList(span);
        observableResult.observe(projects.length, { metric: "projects.total" });
      } catch (err) {
        logger.error("Failed to observe projects total", err);
      }
    },
    "Total number of projects in the sourcecode editor",
  );

  // ObservableGauge: total branches across all projects
  branchesTotalGauge = meter.createObservableGauge(
    "sourcecode.branches.total",
    async (observableResult) => {
      try {
        const projects = await ProjectsDataList(span);
        let totalBranches = 0;
        for (const project of projects) {
          if (project.info && typeof project.info === "object") {
            // Branch count will be available from ProjectsSync data
            totalBranches += project.info.branchCount || 0;
          }
        }
        observableResult.observe(totalBranches, { metric: "branches.total" });
      } catch (err) {
        logger.error("Failed to observe branches total", err);
      }
    },
    "Total number of git branches across all projects",
  );

  // ObservableGauge: files with pending changes
  filesModifiedGauge = meter.createObservableGauge(
    "sourcecode.files.modified",
    async (observableResult) => {
      try {
        const projects = await ProjectsDataList(span);
        let totalFiles = 0;
        for (const project of projects) {
          if (project.info && typeof project.info === "object") {
            totalFiles += project.info.pendingFiles || 0;
          }
        }
        observableResult.observe(totalFiles, { metric: "files.modified" });
      } catch (err) {
        logger.error("Failed to observe files modified", err);
      }
    },
    "Total number of files with pending (uncommitted) changes",
  );

  // Counter: total commits made through the editor
  commitsCounter = meter.createCounter("sourcecode.commits.counter");

  span.end();
}

export function SourceCodeMetricsIncrementCommits(count: number = 1): void {
  commitsCounter.add(count, { metric: "commits.counter" });
}
