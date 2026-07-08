import * as path from "path";
import * as os from "os";
import * as fse from "fs-extra";
import { GitHubMetricsInit } from "./GitHubMetrics";

// Capture observable gauge registrations.
const gaugeCallbacks = new Map<
  string,
  {
    callback: (observableResult: {
      observe: (value: number, attributes: Record<string, string>) => void;
    }) => void;
    description: string;
  }
>();

const mockMeter = {
  createObservableGauge: jest.fn(
    (
      key: string,
      callback: (observableResult: {
        observe: (value: number, attributes: Record<string, string>) => void;
      }) => void,
      description?: string,
    ) => {
      gaugeCallbacks.set(key, {
        callback,
        description: description || "",
      });
      return {};
    },
  ),
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

jest.mock("./WatchedRepos", () => ({
  WatchedReposInit: jest.fn(),
  getWatchedRepos: jest.fn(),
}));

jest.mock("./GitHubApi", () => ({
  GitHubSetToken: jest.fn(),
  GitHubIsEnabled: jest.fn().mockReturnValue(true),
}));

import { getWatchedRepos, WatchedReposInit } from "./WatchedRepos";
import { GitHubIsEnabled, GitHubSetToken } from "./GitHubApi";

let testDir: string;

beforeEach(() => {
  testDir = path.join(
    os.tmpdir(),
    `github-metrics-test-${Date.now()}-${Math.random()}`,
  );
  gaugeCallbacks.clear();
  jest.clearAllMocks();
  // Default: no watched repos (empty list) so that init doesn't crash.
  (getWatchedRepos as jest.Mock).mockResolvedValue([]);
  jest.useFakeTimers();
});

afterEach(async () => {
  jest.useRealTimers();
  await fse.remove(testDir);
});

/* eslint-disable @typescript-eslint/no-explicit-any */

describe("GitHubMetrics", () => {
  describe("GitHubMetricsInit", () => {
    test("should create three observable gauges on init", async () => {
      const config = {
        DATA_DIR: testDir,
        GITHUB_TOKEN: "",
        GITHUB_SYNC_FREQUENCY: 60000,
      } as any;
      await GitHubMetricsInit(null as any, config);

      expect(gaugeCallbacks.has("github.actions.success.rate")).toBe(true);
      expect(gaugeCallbacks.has("github.prs.open")).toBe(true);
      expect(gaugeCallbacks.has("github.branches")).toBe(true);
    });

    test("should initialise WatchedRepos and set token from config", async () => {
      (WatchedReposInit as jest.Mock).mockClear();

      const config = {
        DATA_DIR: testDir,
        GITHUB_TOKEN: "ghp_test_token",
        GITHUB_SYNC_FREQUENCY: 60000,
      } as any;
      await GitHubMetricsInit(null as any, config);

      expect(WatchedReposInit).toHaveBeenCalledWith(config);

      expect(GitHubSetToken).toHaveBeenCalledWith("ghp_test_token");
    });
  });

  describe("observable gauges - actions success rate", () => {
    test("should report success rate from cached actions data", async () => {
      // Setup: create cached actions file
      const actionsDir = path.join(testDir, "github/actions/org1");
      await fse.ensureDir(actionsDir);
      await fse.writeJson(path.join(actionsDir, "repo1.json"), [
        { conclusion: "success" },
        { conclusion: "success" },
        { conclusion: "failure" },
        { conclusion: "cancelled" },
        { conclusion: null }, // in-progress, not completed
      ]);

      (getWatchedRepos as jest.Mock).mockResolvedValue([
        { org: "org1", repo: "repo1" },
      ]);

      const config = {
        DATA_DIR: testDir,
        GITHUB_TOKEN: "token",
        GITHUB_SYNC_FREQUENCY: 60000,
      } as any;
      await GitHubMetricsInit(null as any, config);

      // Trigger the observable gauge callback for actions
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const gaugeEntry = gaugeCallbacks.get("github.actions.success.rate")!;
      const observations: {
        value: number;
        attributes: Record<string, string>;
      }[] = [];
      gaugeEntry.callback({
        observe(value: number, attributes: Record<string, string>) {
          observations.push({ value, attributes });
        },
      });

      expect(observations).toHaveLength(1);
      expect(observations[0].value).toBeCloseTo(0.5, 5); // 2 success / 4 completed
      expect(observations[0].attributes).toEqual({
        org: "org1",
        repo: "repo1",
      });
    });

    test("should handle empty actions list", async () => {
      const actionsDir = path.join(testDir, "github/actions/org1");
      await fse.ensureDir(actionsDir);
      await fse.writeJson(path.join(actionsDir, "repo1.json"), []);

      (getWatchedRepos as jest.Mock).mockResolvedValue([
        { org: "org1", repo: "repo1" },
      ]);

      const config = {
        DATA_DIR: testDir,
        GITHUB_TOKEN: "token",
        GITHUB_SYNC_FREQUENCY: 60000,
      } as any;
      await GitHubMetricsInit(null as any, config);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const gaugeEntry = gaugeCallbacks.get("github.actions.success.rate")!;
      const observations: {
        value: number;
        attributes: Record<string, string>;
      }[] = [];
      gaugeEntry.callback({
        observe(value: number, attributes: Record<string, string>) {
          observations.push({ value, attributes });
        },
      });

      expect(observations).toHaveLength(1);
      expect(observations[0].value).toBe(0);
    });

    test("should report rate per repo across multiple watched repos", async () => {
      // Setup actions dirs
      await fse.ensureDir(path.join(testDir, "github/actions/org1"));
      await fse.ensureDir(path.join(testDir, "github/actions/org2"));
      await fse.writeJson(
        path.join(testDir, "github/actions/org1/repoA.json"),
        [{ conclusion: "success" }, { conclusion: "success" }],
      );
      await fse.writeJson(
        path.join(testDir, "github/actions/org2/repoB.json"),
        [{ conclusion: "failure" }, { conclusion: "success" }],
      );

      (getWatchedRepos as jest.Mock).mockResolvedValue([
        { org: "org1", repo: "repoA" },
        { org: "org2", repo: "repoB" },
      ]);

      const config = {
        DATA_DIR: testDir,
        GITHUB_TOKEN: "token",
        GITHUB_SYNC_FREQUENCY: 60000,
      } as any;
      await GitHubMetricsInit(null as any, config);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const gaugeEntry = gaugeCallbacks.get("github.actions.success.rate")!;
      const observations: {
        value: number;
        attributes: Record<string, string>;
      }[] = [];
      gaugeEntry.callback({
        observe(value: number, attributes: Record<string, string>) {
          observations.push({ value, attributes });
        },
      });

      expect(observations).toHaveLength(2);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const org1Obs = observations.find((o) => o.attributes.org === "org1")!;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const org2Obs = observations.find((o) => o.attributes.org === "org2")!;
      expect(org1Obs.value).toBe(1); // 2/2 success
      expect(org2Obs.value).toBe(0.5); // 1/2 success
    });
  });

  describe("observable gauges - PR count", () => {
    test("should report PR count from cached pulls data", async () => {
      const pullsDir = path.join(testDir, "github/pulls/org1");
      await fse.ensureDir(pullsDir);
      await fse.writeJson(path.join(pullsDir, "repo1.json"), [
        { number: 1, title: "PR 1" },
        { number: 2, title: "PR 2" },
        { number: 3, title: "PR 3" },
      ]);

      (getWatchedRepos as jest.Mock).mockResolvedValue([
        { org: "org1", repo: "repo1" },
      ]);

      const config = {
        DATA_DIR: testDir,
        GITHUB_TOKEN: "token",
        GITHUB_SYNC_FREQUENCY: 60000,
      } as any;
      await GitHubMetricsInit(null as any, config);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const gaugeEntry = gaugeCallbacks.get("github.prs.open")!;
      const observations: {
        value: number;
        attributes: Record<string, string>;
      }[] = [];
      gaugeEntry.callback({
        observe(value: number, attributes: Record<string, string>) {
          observations.push({ value, attributes });
        },
      });

      expect(observations).toHaveLength(1);
      expect(observations[0].value).toBe(3);
      expect(observations[0].attributes).toEqual({
        org: "org1",
        repo: "repo1",
      });
    });
  });

  describe("observable gauges - branches count", () => {
    test("should report branch count from cached branches data", async () => {
      const branchesDir = path.join(testDir, "github/branches/org1");
      await fse.ensureDir(branchesDir);
      await fse.writeJson(path.join(branchesDir, "repo1.json"), {
        count: 12,
      });

      (getWatchedRepos as jest.Mock).mockResolvedValue([
        { org: "org1", repo: "repo1" },
      ]);

      const config = {
        DATA_DIR: testDir,
        GITHUB_TOKEN: "token",
        GITHUB_SYNC_FREQUENCY: 60000,
      } as any;
      await GitHubMetricsInit(null as any, config);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const gaugeEntry = gaugeCallbacks.get("github.branches")!;
      const observations: {
        value: number;
        attributes: Record<string, string>;
      }[] = [];
      gaugeEntry.callback({
        observe(value: number, attributes: Record<string, string>) {
          observations.push({ value, attributes });
        },
      });

      expect(observations).toHaveLength(1);
      expect(observations[0].value).toBe(12);
      expect(observations[0].attributes).toEqual({
        org: "org1",
        repo: "repo1",
      });
    });
  });

  describe("GitHub disabled", () => {
    test("should skip stats update when GitHub is not enabled", async () => {
      (GitHubIsEnabled as jest.Mock).mockReturnValue(false);

      const config = {
        DATA_DIR: testDir,
        GITHUB_TOKEN: "",
        GITHUB_SYNC_FREQUENCY: 60000,
      } as any;
      await GitHubMetricsInit(null as any, config);

      // Gauges should still be registered
      expect(gaugeCallbacks.has("github.actions.success.rate")).toBe(true);
      expect(gaugeCallbacks.has("github.prs.open")).toBe(true);
      expect(gaugeCallbacks.has("github.branches")).toBe(true);
    });
  });

  describe("missing cache files", () => {
    test("should gracefully handle missing cache files", async () => {
      (getWatchedRepos as jest.Mock).mockResolvedValue([
        { org: "nonexistent", repo: "norepo" },
      ]);

      const config = {
        DATA_DIR: testDir,
        GITHUB_TOKEN: "token",
        GITHUB_SYNC_FREQUENCY: 60000,
      } as any;
      await GitHubMetricsInit(null as any, config);

      // All gauges should produce empty observations (no data)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const actionsEntry = gaugeCallbacks.get(
        "github.actions.success.rate",
      )!;
      const actionsObs: any[] = [];
      actionsEntry.callback({
        observe: (v: number, a: any) => actionsObs.push({ v, a }),
      });
      expect(actionsObs).toHaveLength(0);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const prsEntry = gaugeCallbacks.get("github.prs.open")!;
      const prsObs: any[] = [];
      prsEntry.callback({
        observe: (v: number, a: any) => prsObs.push({ v, a }),
      });
      expect(prsObs).toHaveLength(0);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const branchesEntry = gaugeCallbacks.get("github.branches")!;
      const branchesObs: any[] = [];
      branchesEntry.callback({
        observe: (v: number, a: any) => branchesObs.push({ v, a }),
      });
      expect(branchesObs).toHaveLength(0);
    });
  });
});
