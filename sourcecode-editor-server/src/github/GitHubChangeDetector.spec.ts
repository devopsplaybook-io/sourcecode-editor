import {
  GitHubActionRun,
  GitHubPR,
} from "./GitHubApi";
import {
  DetectNewFailedRuns,
  DetectNewPulls,
  DetectDisappearedPulls,
} from "./GitHubChangeDetector";

function makeRun(
  id: number,
  conclusion: string | null,
): GitHubActionRun {
  return {
    id,
    name: `workflow-${id}`,
    head_branch: "main",
    status: conclusion === null ? "in_progress" : "completed",
    conclusion,
    html_url: `https://github.com/org/repo/actions/runs/${id}`,
    created_at: "2026-10-18T00:00:00Z",
    updated_at: "2026-10-18T00:05:00Z",
    workflow_id: 1,
  };
}

function makePull(number: number, state = "open"): GitHubPR {
  return {
    number,
    title: `PR ${number}`,
    state,
    draft: false,
    head: { ref: "feature", sha: "abc" },
    base: { ref: "main", sha: "def" },
    user: { login: "someone" },
    html_url: `https://github.com/org/repo/pull/${number}`,
    created_at: "2026-10-18T00:00:00Z",
    mergeable: null,
  };
}

describe("DetectNewFailedRuns", () => {
  test("returns nothing when previous is null (baseline)", () => {
    expect(DetectNewFailedRuns(null, [makeRun(1, "failure")])).toEqual([]);
  });

  test("returns nothing for empty inputs", () => {
    expect(DetectNewFailedRuns([], [])).toEqual([]);
    expect(DetectNewFailedRuns([makeRun(1, "success")], [])).toEqual([]);
  });

  test("detects a newly failed run", () => {
    const previous = [makeRun(1, "success")];
    const next = [makeRun(1, "success"), makeRun(2, "failure")];
    expect(DetectNewFailedRuns(previous, next)).toEqual([makeRun(2, "failure")]);
  });

  test("detects an in-progress run transitioning to failure", () => {
    const previous = [makeRun(1, null)];
    const next = [makeRun(1, "failure")];
    expect(DetectNewFailedRuns(previous, next)).toEqual([
      makeRun(1, "failure"),
    ]);
  });

  test("does not re-emit an already-known failure", () => {
    const previous = [makeRun(1, "failure")];
    const next = [makeRun(1, "failure")];
    expect(DetectNewFailedRuns(previous, next)).toEqual([]);
  });

  test("does not emit successful runs", () => {
    const previous = [makeRun(1, "success")];
    const next = [makeRun(1, "success"), makeRun(2, "success")];
    expect(DetectNewFailedRuns(previous, next)).toEqual([]);
  });
});

describe("DetectNewPulls", () => {
  test("returns nothing when previous is null (baseline)", () => {
    expect(DetectNewPulls(null, [makePull(1)])).toEqual([]);
  });

  test("returns nothing for empty inputs", () => {
    expect(DetectNewPulls([], [])).toEqual([]);
    expect(DetectNewPulls([makePull(1)], [])).toEqual([]);
  });

  test("detects a newly opened pull request", () => {
    const previous = [makePull(1)];
    const next = [makePull(1), makePull(2)];
    expect(DetectNewPulls(previous, next)).toEqual([makePull(2)]);
  });
});

describe("DetectDisappearedPulls", () => {
  test("returns nothing when previous is null (baseline)", () => {
    expect(DetectDisappearedPulls(null, [makePull(1)])).toEqual([]);
  });

  test("returns nothing for empty inputs", () => {
    expect(DetectDisappearedPulls([], [])).toEqual([]);
    expect(DetectDisappearedPulls([], [makePull(1)])).toEqual([]);
  });

  test("detects a pull request that is no longer listed", () => {
    const previous = [makePull(1), makePull(2)];
    const next = [makePull(2)];
    expect(DetectDisappearedPulls(previous, next)).toEqual([makePull(1)]);
  });

  test("reports the previous state of the disappeared pull request", () => {
    const previous = [makePull(1, "open")];
    const next: GitHubPR[] = [];
    const disappeared = DetectDisappearedPulls(previous, next);
    expect(disappeared).toHaveLength(1);
    expect(disappeared[0].number).toBe(1);
    expect(disappeared[0].state).toBe("open");
  });
});
