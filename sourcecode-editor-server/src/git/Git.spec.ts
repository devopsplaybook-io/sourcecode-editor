import * as path from "path";
import * as os from "os";
import * as fs from "fs/promises";
import * as fse from "fs-extra";
import { execSync } from "child_process";

const mockTracer = {
  startSpan: () => ({
    end: jest.fn(),
  }),
};

jest.mock("../OTelContext", () => ({
  OTelTracer: () => mockTracer,
  OTelLogger: () => ({
    createModuleLogger: () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  }),
}));

jest.mock("../ssh/SSH", () => ({
  SSHGetPrivateKeyPath: jest
    .fn()
    .mockResolvedValue("/tmp/git-spec-missing-key"),
}));

import {
  GitCommitFiles,
  GitFileAtRevision,
  GitGetErrorOutput,
  GitInit,
  GitLog,
} from "./Git";

/* eslint-disable @typescript-eslint/no-explicit-any */

let testDir: string;
const project = {
  projectId: "proj1",
  name: "test",
  info: {},
} as any;
const emptyProject = {
  projectId: "proj-empty",
  name: "empty",
  info: {},
} as any;

function git(cwd: string, args: string): void {
  execSync(`git ${args}`, { cwd, stdio: "ignore" });
}

beforeEach(async () => {
  testDir = path.join(
    os.tmpdir(),
    `git-history-test-${Date.now()}-${Math.random()}`,
  );
  const projectDir = path.join(testDir, "projects", "proj1");
  const emptyDir = path.join(testDir, "projects", "proj-empty");
  await fs.mkdir(projectDir, { recursive: true });
  await fs.mkdir(emptyDir, { recursive: true });
  git(projectDir, "init");
  git(projectDir, 'config user.name "Test User"');
  git(projectDir, 'config user.email "test@example.com"');
  await fs.writeFile(path.join(projectDir, "file1.txt"), "first content");
  await fs.writeFile(path.join(projectDir, "file2.txt"), "to be deleted");
  git(projectDir, "add -A");
  git(projectDir, 'commit -m "first commit"');
  await fs.writeFile(path.join(projectDir, "file1.txt"), "second content");
  await fs.rm(path.join(projectDir, "file2.txt"));
  git(projectDir, "add -A");
  git(projectDir, 'commit -m "second commit"');
  git(emptyDir, "init");
  await GitInit(null as any, { DATA_DIR: testDir } as any);
});

afterEach(async () => {
  await fse.remove(testDir);
});

describe("GitLog", () => {
  test("parses hash, author, date and message, newest first", async () => {
    const commits = await GitLog(null as any, project, 10);
    expect(commits).toHaveLength(2);
    expect(commits[0].message).toBe("second commit");
    expect(commits[1].message).toBe("first commit");
    for (const commit of commits) {
      expect(commit.hash).toMatch(/^[0-9a-f]{40}$/);
      expect(commit.author).toBe("Test User");
      expect(commit.date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  test("respects the limit", async () => {
    const commits = await GitLog(null as any, project, 1);
    expect(commits).toHaveLength(1);
    expect(commits[0].message).toBe("second commit");
  });

  test("returns an empty list for a repository without commits", async () => {
    const commits = await GitLog(null as any, emptyProject, 10);
    expect(commits).toEqual([]);
  });
});

describe("GitCommitFiles", () => {
  test("maps name-status output to file states", async () => {
    const commits = await GitLog(null as any, project, 1);
    const files = await GitCommitFiles(null as any, project, commits[0].hash);
    const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
    expect(sorted).toEqual([
      { path: "file1.txt", state: "modified" },
      { path: "file2.txt", state: "deleted" },
    ]);
  });

  test("lists added files for the initial commit", async () => {
    const commits = await GitLog(null as any, project, 10);
    const files = await GitCommitFiles(null as any, project, commits[1].hash);
    expect(files).toEqual(
      expect.arrayContaining([
        { path: "file1.txt", state: "new" },
        { path: "file2.txt", state: "new" },
      ]),
    );
  });

  test("rejects an invalid commit hash", async () => {
    await expect(
      GitCommitFiles(null as any, project, "abc; rm -rf /"),
    ).rejects.toThrow("Invalid commit hash");
    await expect(
      GitCommitFiles(null as any, project, "abc"),
    ).rejects.toThrow("Invalid commit hash");
  });
});

describe("GitFileAtRevision", () => {
  test("returns the file content at the given revision", async () => {
    const commits = await GitLog(null as any, project, 10);
    const content = await GitFileAtRevision(
      null as any,
      project,
      commits[1].hash,
      "file1.txt",
    );
    expect(content).toBe("first content");
  });

  test("returns empty string when the file does not exist at the revision", async () => {
    const commits = await GitLog(null as any, project, 1);
    const content = await GitFileAtRevision(
      null as any,
      project,
      commits[0].hash,
      "no-such-file.txt",
    );
    expect(content).toBe("");
  });

  test("rejects an invalid commit hash", async () => {
    await expect(
      GitFileAtRevision(null as any, project, "../elsewhere", "file1.txt"),
    ).rejects.toThrow("Invalid commit hash");
  });
});

describe("GitGetErrorOutput", () => {
  test("returns the trimmed stderr when present", () => {
    expect(
      GitGetErrorOutput({
        stderr: "  git failure output \n",
        stdout: "",
        message: "Command failed",
      }),
    ).toBe("git failure output");
  });

  test("falls back to stdout when stderr is empty", () => {
    expect(
      GitGetErrorOutput({ stderr: "", stdout: "command output\n" }),
    ).toBe("command output");
  });

  test("falls back to the message", () => {
    expect(GitGetErrorOutput({ message: "boom" })).toBe("boom");
  });

  test("returns empty for unknown error shapes", () => {
    expect(GitGetErrorOutput({})).toBe("");
    expect(GitGetErrorOutput(undefined)).toBe("");
  });
});
