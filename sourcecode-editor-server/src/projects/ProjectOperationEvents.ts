import { Span } from "@opentelemetry/sdk-trace-base";
import { Project } from "../model/Project";
import { OTelLogger } from "../OTelContext";
import { EventBusEmit } from "../events/EventBus";
import { GitGetErrorOutput } from "../git/Git";
import { ProjectsSyncStartProject } from "./ProjectsSync";

const logger = OTelLogger().createModuleLogger("ProjectOperationEvents");

// Human-readable labels broadcast with the started events so the UI can
// show what is happening ("Cloning repository…") instead of a spinner only.
const OPERATION_PHASES: Record<string, string> = {
  "git.clone": "Cloning repository",
  "git.pull": "Pulling",
  "git.push": "Pushing",
  "git.commit": "Committing",
  "git.checkout": "Switching branch",
  "git.reset": "Resetting",
  "git.discard": "Discarding changes",
  "git.branch.create": "Creating branch",
  "git.branch.delete": "Deleting branch",
};

// Wraps a git operation with started/completed/failed broadcasts and
// a status refresh after success. Centralising this guarantees every
// operation broadcasts consistently and avoids per-route duplication.
export async function RunWithEvents(
  span: Span,
  project: Project,
  baseEventType: string, // e.g. "git.pull"
  fn: () => Promise<void>,
  options: {
    syncParts?: string[]; // forwarded to ProjectsSyncStartProject
    completedDetail?: Record<string, unknown>;
  } = {},
): Promise<void> {
  const repository = project.projectId;
  EventBusEmit({
    repository,
    eventType: `${baseEventType}.started`,
    eventDetail: {
      project: { id: project.projectId, name: project.name },
      phase: OPERATION_PHASES[baseEventType] || baseEventType,
    },
  });
  try {
    await fn();
    // ProjectsSyncStartProject itself emits git.status.changed.
    await ProjectsSyncStartProject(span, project, options.syncParts);
    EventBusEmit({
      repository,
      eventType: `${baseEventType}.completed`,
      eventDetail: { ...options.completedDetail },
    });
  } catch (err) {
    logger.error(`Operation ${baseEventType} failed`, err, span);
    EventBusEmit({
      repository,
      eventType: `${baseEventType}.failed`,
      eventDetail: {
        message: err instanceof Error ? err.message : String(err),
        output: GitGetErrorOutput(err),
      },
    });
    throw err;
  }
}
