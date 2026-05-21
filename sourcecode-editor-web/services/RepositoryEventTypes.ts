// Mirror of sourcecode-editor-server/src/events/RepositoryEventTypes.ts
// Keep in sync — the two packages do not share TS modules.

export interface RepositoryEvent<T = unknown> {
  repository: string;
  eventType: string;
  eventDetail: T;
  ts: number;
}

export const RepositoryEventTypes = {
  PROJECT_CREATED: "project.created",
  PROJECT_UPDATED: "project.updated",
  PROJECT_DELETED: "project.deleted",

  GIT_CLONE_STARTED: "git.clone.started",
  GIT_CLONE_COMPLETED: "git.clone.completed",
  GIT_CLONE_FAILED: "git.clone.failed",

  GIT_PULL_STARTED: "git.pull.started",
  GIT_PULL_COMPLETED: "git.pull.completed",
  GIT_PULL_FAILED: "git.pull.failed",

  GIT_PUSH_STARTED: "git.push.started",
  GIT_PUSH_COMPLETED: "git.push.completed",
  GIT_PUSH_FAILED: "git.push.failed",

  GIT_COMMIT_STARTED: "git.commit.started",
  GIT_COMMIT_COMPLETED: "git.commit.completed",
  GIT_COMMIT_FAILED: "git.commit.failed",

  GIT_CHECKOUT_STARTED: "git.checkout.started",
  GIT_CHECKOUT_COMPLETED: "git.checkout.completed",
  GIT_CHECKOUT_FAILED: "git.checkout.failed",

  GIT_RESET_STARTED: "git.reset.started",
  GIT_RESET_COMPLETED: "git.reset.completed",
  GIT_RESET_FAILED: "git.reset.failed",

  GIT_BRANCH_CREATED: "git.branch.created",
  GIT_BRANCH_DELETED: "git.branch.deleted",
  GIT_BRANCH_FAILED: "git.branch.failed",

  // GitHub operations
  GITHUB_CLONE_STARTED: "github.clone.started",
  GITHUB_CLONE_COMPLETED: "github.clone.completed",
  GITHUB_CLONE_FAILED: "github.clone.failed",

  GIT_STATUS_CHANGED: "git.status.changed",

  FILE_CREATED: "file.created",
  FILE_DELETED: "file.deleted",
  FILE_RENAMED: "file.renamed",
  FILE_UPDATED: "file.updated",
} as const;

export type RepositoryEventType =
  (typeof RepositoryEventTypes)[keyof typeof RepositoryEventTypes];

export const REPOSITORY_EVENT_WILDCARD = "*";
