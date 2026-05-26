import { Counter } from "@opentelemetry/api";
import { Span } from "@opentelemetry/sdk-trace-base";
import { OTelMeter, OTelTracer } from "../OTelContext";

let githubRepoAddedCounter: Counter;
let gitProjectCloneCounter: Counter;

export async function GitHubMetricsInit(context: Span): Promise<void> {
  const span = OTelTracer().startSpan("GitHubMetricsInit", context);
  const meter = OTelMeter();

  // Counter: incremented each time a new GitHub repository / project is added.
  githubRepoAddedCounter = meter.createCounter("github.repo.added");

  // Counter: incremented each time a project is cloned (either on creation
  // or via the explicit clone operation).
  gitProjectCloneCounter = meter.createCounter("git.project.clone");

  span.end();
}

/**
 * Increment the counter when a new GitHub repository / project is added.
 */
export function GitHubRepoAdded(org: string, repo: string): void {
  githubRepoAddedCounter.add(1, { org, repo });
}

/**
 * Increment the counter when a project is cloned.
 */
export function GitProjectClone(projectId: string): void {
  gitProjectCloneCounter.add(1, { projectId });
}
