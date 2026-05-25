import * as path from "path";
import * as os from "os";
import * as fse from "fs-extra";
import { Config } from "../Config";
import { GitHubMetricsInit } from "./GitHubMetrics";

// Mock OTel context to capture observable gauge callbacks
const capturedCallbacks = new Map<
  string,
  (result: {
    observations: { value: number; attributes: Record<string, string> }[];
  }) => void
>();

const mockObservableResult = () => {
  const observations: {
    value: number;
    attributes: Record<string, string>;
  }[] = [];
  return {
    observations,
    observe(value: number, attributes: Record<string, string>) {
      observations.push({ value, attributes });
    },
  };
};

const mockMeter = {
  createObservableGauge: (
    name: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback: (result: any) => void,
  ) => {
    capturedCallbacks.set(name, callback);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { name } as any;
  },
};

const mockTracer = {
  startSpan: () => ({
    end: jest.fn(),
  }),
};

jest.mock("../OTelContext", () => ({
  OTelMeter: () => mockMeter,
  OTelTracer: () => mockTracer,
  OTelLogger: () => ({
    createModuleLogger: () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  }),
}));

// Mock Config to avoid uuid ESM import issue
jest.mock("../Config", () => ({
  Config: class {
    DATA_DIR = "";
    VERSION = "1";
    SERVICE_ID = "sourcecode-editor-server";
    CONFIG_FILE = "config.json";
  },
}));

let testDir: string;

beforeEach(() => {
  testDir = path.join(
    os.tmpdir(),
    `github-metrics-test-${Date.now()}-${Math.random()}`,
  );
  capturedCallbacks.clear();
});

afterEach(async () => {
  await fse.remove(testDir);
});

function createTestConfig(dataDir: string): Config {
  const cfg = new Config();
  cfg.DATA_DIR = dataDir;
  return cfg;
}

/**
 * Helper: creates a PR JSON file under pulls/{org}/{repo}.json
 */
async function writePullsFile(
  baseDir: string,
  org: string,
  repo: string,
  pulls: { state: string; draft?: boolean }[],
): Promise<void> {
  const filePath = path.join(baseDir, "pulls", org, `${repo}.json`);
  await fse.ensureDir(path.dirname(filePath));
  await fse.writeJson(
    filePath,
    pulls.map((p, i) => ({
      number: i + 1,
      title: `PR ${i + 1}`,
      state: p.state,
      draft: p.draft || false,
      head: { ref: "feature", sha: "abc123" },
      base: { ref: "main", sha: "def456" },
      user: { login: "testuser" },
      html_url: `https://github.com/${org}/${repo}/pulls/${i + 1}`,
      created_at: new Date().toISOString(),
      mergeable: true,
    })),
  );
}

/**
 * Helper: creates an actions JSON file under actions/{org}/{repo}.json
 */
async function writeActionsFile(
  baseDir: string,
  org: string,
  repo: string,
  runs: { status: string; conclusion?: string | null }[],
): Promise<void> {
  const filePath = path.join(baseDir, "actions", org, `${repo}.json`);
  await fse.ensureDir(path.dirname(filePath));
  await fse.writeJson(
    filePath,
    runs.map((r, i) => ({
      id: i + 1,
      name: `Workflow ${i + 1}`,
      head_branch: "main",
      status: r.status,
      conclusion: r.conclusion || null,
      html_url: `https://github.com/${org}/${repo}/actions/runs/${i + 1}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      workflow_id: 100 + i,
    })),
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
describe("GitHubMetrics", () => {
  describe("github.pulls.per_repo", () => {
    test("should report 0 when pulls directory does not exist", async () => {
      const config = createTestConfig(testDir);
      // No pulls directory created - should gracefully handle
      await GitHubMetricsInit(null as any, config);

      const callback = capturedCallbacks.get("github.pulls.per_repo");
      expect(callback).toBeDefined();

      const result = mockObservableResult();
      await callback(result);
      expect(result.observations).toHaveLength(0);
    });

    test("should report open PR count per repo, excluding drafts", async () => {
      const config = createTestConfig(testDir);
      const githubDir = path.join(testDir, "github");

      // Write pulls: 2 open non-draft, 1 draft, 1 closed
      await writePullsFile(githubDir, "org1", "repo1", [
        { state: "open", draft: false },
        { state: "open", draft: false },
        { state: "open", draft: true },
        { state: "closed", draft: false },
      ]);

      await GitHubMetricsInit(null as any, config);

      const callback = capturedCallbacks.get("github.pulls.per_repo");
      expect(callback).toBeDefined();

      const result = mockObservableResult();
      await callback(result);
      expect(result.observations).toHaveLength(1);
      expect(result.observations[0]).toEqual({
        value: 2,
        attributes: { org: "org1", repo: "repo1" },
      });
    });

    test("should report PR counts for multiple orgs and repos", async () => {
      const config = createTestConfig(testDir);
      const githubDir = path.join(testDir, "github");

      await writePullsFile(githubDir, "org1", "repo1", [
        { state: "open", draft: false },
      ]);
      await writePullsFile(githubDir, "org1", "repo2", [
        { state: "open", draft: false },
        { state: "open", draft: false },
      ]);
      await writePullsFile(githubDir, "org2", "repo1", [
        { state: "open", draft: false },
        { state: "open", draft: false },
        { state: "open", draft: false },
      ]);

      await GitHubMetricsInit(null as any, config);

      const callback = capturedCallbacks.get("github.pulls.per_repo");
      const result = mockObservableResult();
      await callback(result);

      expect(result.observations).toHaveLength(3);
      expect(result.observations).toContainEqual({
        value: 1,
        attributes: { org: "org1", repo: "repo1" },
      });
      expect(result.observations).toContainEqual({
        value: 2,
        attributes: { org: "org1", repo: "repo2" },
      });
      expect(result.observations).toContainEqual({
        value: 3,
        attributes: { org: "org2", repo: "repo1" },
      });
    });
  });

  describe("github.actions.success_rate", () => {
    test("should report 0 when actions directory does not exist", async () => {
      const config = createTestConfig(testDir);
      await GitHubMetricsInit(null as any, config);

      const callback = capturedCallbacks.get("github.actions.success_rate");
      expect(callback).toBeDefined();

      const result = mockObservableResult();
      await callback(result);
      expect(result.observations).toHaveLength(0);
    });

    test("should report 100% when all completed actions are successful", async () => {
      const config = createTestConfig(testDir);
      const githubDir = path.join(testDir, "github");

      await writeActionsFile(githubDir, "org1", "repo1", [
        { status: "completed", conclusion: "success" },
        { status: "completed", conclusion: "success" },
      ]);

      await GitHubMetricsInit(null as any, config);

      const callback = capturedCallbacks.get("github.actions.success_rate");
      const result = mockObservableResult();
      await callback(result);

      expect(result.observations).toHaveLength(1);
      expect(result.observations[0].value).toBe(100);
    });

    test("should report 0% when all completed actions failed", async () => {
      const config = createTestConfig(testDir);
      const githubDir = path.join(testDir, "github");

      await writeActionsFile(githubDir, "org1", "repo1", [
        { status: "completed", conclusion: "failure" },
        { status: "completed", conclusion: "cancelled" },
      ]);

      await GitHubMetricsInit(null as any, config);

      const callback = capturedCallbacks.get("github.actions.success_rate");
      const result = mockObservableResult();
      await callback(result);

      expect(result.observations).toHaveLength(1);
      expect(result.observations[0].value).toBe(0);
    });

    test("should report correct percentage for mixed results", async () => {
      const config = createTestConfig(testDir);
      const githubDir = path.join(testDir, "github");

      // 3 successful, 1 failed = 75%
      await writeActionsFile(githubDir, "org1", "repo1", [
        { status: "completed", conclusion: "success" },
        { status: "completed", conclusion: "success" },
        { status: "completed", conclusion: "success" },
        { status: "completed", conclusion: "failure" },
      ]);

      await GitHubMetricsInit(null as any, config);

      const callback = capturedCallbacks.get("github.actions.success_rate");
      const result = mockObservableResult();
      await callback(result);

      expect(result.observations).toHaveLength(1);
      expect(result.observations[0].value).toBe(75);
    });

    test("should report 0 when there are no completed actions", async () => {
      const config = createTestConfig(testDir);
      const githubDir = path.join(testDir, "github");

      await writeActionsFile(githubDir, "org1", "repo1", [
        { status: "in_progress" },
        { status: "queued" },
      ]);

      await GitHubMetricsInit(null as any, config);

      const callback = capturedCallbacks.get("github.actions.success_rate");
      const result = mockObservableResult();
      await callback(result);

      expect(result.observations).toHaveLength(1);
      expect(result.observations[0].value).toBe(0);
    });

    test("should report success rate for multiple orgs and repos", async () => {
      const config = createTestConfig(testDir);
      const githubDir = path.join(testDir, "github");

      // repo1: 2 success out of 4 completed = 50%
      await writeActionsFile(githubDir, "org1", "repo1", [
        { status: "completed", conclusion: "success" },
        { status: "completed", conclusion: "success" },
        { status: "completed", conclusion: "failure" },
        { status: "completed", conclusion: "failure" },
      ]);
      // repo2: 2 success out of 2 completed = 100%
      await writeActionsFile(githubDir, "org1", "repo2", [
        { status: "completed", conclusion: "success" },
        { status: "completed", conclusion: "success" },
      ]);
      // repo3: 1 success out of 10 completed = 10%
      await writeActionsFile(githubDir, "org2", "repo1", [
        { status: "completed", conclusion: "success" },
        { status: "completed", conclusion: "failure" },
        { status: "completed", conclusion: "failure" },
        { status: "completed", conclusion: "failure" },
        { status: "completed", conclusion: "failure" },
        { status: "completed", conclusion: "failure" },
        { status: "completed", conclusion: "failure" },
        { status: "completed", conclusion: "failure" },
        { status: "completed", conclusion: "failure" },
        { status: "completed", conclusion: "failure" },
      ]);

      await GitHubMetricsInit(null as any, config);

      const callback = capturedCallbacks.get("github.actions.success_rate");
      const result = mockObservableResult();
      await callback(result);

      expect(result.observations).toHaveLength(3);
      expect(result.observations).toContainEqual({
        value: 50,
        attributes: { org: "org1", repo: "repo1" },
      });
      expect(result.observations).toContainEqual({
        value: 100,
        attributes: { org: "org1", repo: "repo2" },
      });
      expect(result.observations).toContainEqual({
        value: 10,
        attributes: { org: "org2", repo: "repo1" },
      });
    });
  });
});
