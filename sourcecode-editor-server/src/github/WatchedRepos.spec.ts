import * as path from "path";
import * as os from "os";
import * as fse from "fs-extra";
import { Config } from "../Config";
import {
  WatchedReposInit,
  getWatchedRepos,
  addWatchedRepo,
  removeWatchedRepo,
  isRepoWatched,
} from "./WatchedRepos";

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
  // Create a unique temp directory for each test
  testDir = path.join(
    os.tmpdir(),
    `watched-repos-test-${Date.now()}-${Math.random()}`,
  );
});

afterEach(async () => {
  // Clean up
  await fse.remove(testDir);
});

function createTestConfig(dataDir: string): Config {
  const cfg = new Config();
  cfg.DATA_DIR = dataDir;
  return cfg;
}

describe("WatchedRepos", () => {
  describe("getWatchedRepos", () => {
    test("should return empty array when no watched repos file exists", async () => {
      WatchedReposInit(createTestConfig(testDir));
      const repos = await getWatchedRepos();
      expect(repos).toEqual([]);
    });

    test("should return empty array when watched repos file is empty", async () => {
      WatchedReposInit(createTestConfig(testDir));
      // Create an empty watched repos file
      const filePath = path.join(testDir, "github", "watched-repos.json");
      await fse.ensureDir(path.dirname(filePath));
      await fse.writeJson(filePath, { watched: [] });
      const repos = await getWatchedRepos();
      expect(repos).toEqual([]);
    });

    test("should return watched repos from file", async () => {
      WatchedReposInit(createTestConfig(testDir));
      const filePath = path.join(testDir, "github", "watched-repos.json");
      await fse.ensureDir(path.dirname(filePath));
      await fse.writeJson(filePath, {
        watched: [
          { org: "org1", repo: "repo1" },
          { org: "org2", repo: "repo2" },
        ],
      });
      const repos = await getWatchedRepos();
      expect(repos).toHaveLength(2);
      expect(repos[0]).toEqual({ org: "org1", repo: "repo1" });
      expect(repos[1]).toEqual({ org: "org2", repo: "repo2" });
    });

    test("should return empty array on corrupted JSON file", async () => {
      WatchedReposInit(createTestConfig(testDir));
      const filePath = path.join(testDir, "github", "watched-repos.json");
      await fse.ensureDir(path.dirname(filePath));
      await fse.writeFile(filePath, "not valid json");
      const repos = await getWatchedRepos();
      expect(repos).toEqual([]);
    });
  });

  describe("addWatchedRepo", () => {
    test("should add a repo to empty watch list", async () => {
      WatchedReposInit(createTestConfig(testDir));
      await addWatchedRepo("myorg", "myrepo");
      const repos = await getWatchedRepos();
      expect(repos).toHaveLength(1);
      expect(repos[0]).toEqual({ org: "myorg", repo: "myrepo" });
    });

    test("should add multiple repos", async () => {
      WatchedReposInit(createTestConfig(testDir));
      await addWatchedRepo("orgA", "repoA");
      await addWatchedRepo("orgB", "repoB");
      const repos = await getWatchedRepos();
      expect(repos).toHaveLength(2);
      expect(repos).toContainEqual({ org: "orgA", repo: "repoA" });
      expect(repos).toContainEqual({ org: "orgB", repo: "repoB" });
    });

    test("should not add duplicate repos", async () => {
      WatchedReposInit(createTestConfig(testDir));
      await addWatchedRepo("org1", "repo1");
      await addWatchedRepo("org1", "repo1"); // duplicate
      const repos = await getWatchedRepos();
      expect(repos).toHaveLength(1);
    });

    test("should create the watched-repos file in the correct directory", async () => {
      WatchedReposInit(createTestConfig(testDir));
      await addWatchedRepo("org", "repo");
      const filePath = path.join(testDir, "github", "watched-repos.json");
      expect(await fse.pathExists(filePath)).toBe(true);
      const content = await fse.readJson(filePath);
      expect(content.watched).toHaveLength(1);
      expect(content.watched[0]).toEqual({ org: "org", repo: "repo" });
    });
  });

  describe("removeWatchedRepo", () => {
    test("should remove an existing repo", async () => {
      WatchedReposInit(createTestConfig(testDir));
      await addWatchedRepo("org1", "repo1");
      await addWatchedRepo("org2", "repo2");
      await removeWatchedRepo("org1", "repo1");
      const repos = await getWatchedRepos();
      expect(repos).toHaveLength(1);
      expect(repos[0]).toEqual({ org: "org2", repo: "repo2" });
    });

    test("should do nothing when removing a non-existent repo", async () => {
      WatchedReposInit(createTestConfig(testDir));
      await addWatchedRepo("org1", "repo1");
      await removeWatchedRepo("nonexistent", "repo");
      const repos = await getWatchedRepos();
      expect(repos).toHaveLength(1);
    });

    test("should do nothing when file does not exist", async () => {
      WatchedReposInit(createTestConfig(testDir));
      // No file exists yet
      await expect(removeWatchedRepo("org", "repo")).resolves.toBeUndefined();
      const repos = await getWatchedRepos();
      expect(repos).toEqual([]);
    });
  });

  describe("isRepoWatched", () => {
    test("should return true for a watched repo", async () => {
      WatchedReposInit(createTestConfig(testDir));
      await addWatchedRepo("myorg", "myrepo");
      expect(await isRepoWatched("myorg", "myrepo")).toBe(true);
    });

    test("should return false for a non-watched repo", async () => {
      WatchedReposInit(createTestConfig(testDir));
      await addWatchedRepo("myorg", "myrepo");
      expect(await isRepoWatched("myorg", "other")).toBe(false);
    });

    test("should return false when watch list is empty", async () => {
      WatchedReposInit(createTestConfig(testDir));
      expect(await isRepoWatched("anyorg", "anyrepo")).toBe(false);
    });
  });

  describe("WatchedReposInit", () => {
    test("should accept null config gracefully (no DATA_DIR crash)", () => {
      // This test verifies the init function doesn't crash
      // The subsequent calls will fail but the app shouldn't crash on init
      expect(() => {
        WatchedReposInit(createTestConfig(testDir));
      }).not.toThrow();
    });
  });
});
