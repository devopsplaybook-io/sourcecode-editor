import { GitHubActionRun, GitHubPR } from "./GitHubApi";

// Pure change-detection between two GitHub cache snapshots. The first
// refresh after startup (previous === null) is a baseline: it must not
// spam notifications about pre-existing state.

export function DetectNewFailedRuns(
  previous: GitHubActionRun[] | null,
  next: GitHubActionRun[],
): GitHubActionRun[] {
  if (previous === null) {
    return [];
  }
  const prevById = new Map(previous.map((run) => [run.id, run]));
  return next.filter(
    (run) =>
      run.conclusion === "failure" &&
      (!prevById.has(run.id) || prevById.get(run.id).conclusion === null),
  );
}

export function DetectNewPulls(
  previous: GitHubPR[] | null,
  next: GitHubPR[],
): GitHubPR[] {
  if (previous === null) {
    return [];
  }
  const prevNumbers = new Set(previous.map((pull) => pull.number));
  return next.filter((pull) => !prevNumbers.has(pull.number));
}

export function DetectDisappearedPulls(
  previous: GitHubPR[] | null,
  next: GitHubPR[],
): GitHubPR[] {
  if (previous === null) {
    return [];
  }
  const nextNumbers = new Set(next.map((pull) => pull.number));
  return previous.filter((pull) => !nextNumbers.has(pull.number));
}
