import * as path from "path";
import * as os from "os";
import * as fs from "fs/promises";
import * as fse from "fs-extra";

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

import { FilesInit, FilesProjectSearch } from "./Files";

let testDir: string;

async function writeProjectFile(relativePath: string, content: string) {
  const absPath = path.join(testDir, "projects", "proj1", relativePath);
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, content);
}

beforeEach(async () => {
  testDir = path.join(
    os.tmpdir(),
    `files-search-test-${Date.now()}-${Math.random()}`,
  );
  await fs.mkdir(path.join(testDir, "projects", "proj1"), {
    recursive: true,
  });
  await FilesInit(null as never, { DATA_DIR: testDir } as never);
});

afterEach(async () => {
  await fse.remove(testDir);
});

/* eslint-disable @typescript-eslint/no-explicit-any */

describe("FilesProjectSearch", () => {
  test("finds case-insensitive matches with 1-based line numbers and trimmed text", async () => {
    await writeProjectFile(
      "src/app.js",
      "hello World\nother line\n  HELLO there  \nno match\n",
    );
    const project = { projectId: "proj1" } as any;
    const matches = await FilesProjectSearch(null as any, project, "hello");
    expect(matches).toEqual([
      { path: path.join("src", "app.js"), line: 1, text: "hello World" },
      { path: path.join("src", "app.js"), line: 3, text: "HELLO there" },
    ]);
  });

  test("ignores node_modules and .git folders", async () => {
    await writeProjectFile("included.txt", "findme\n");
    await writeProjectFile("node_modules/dep/index.js", "findme\n");
    await writeProjectFile(".git/config", "findme\n");
    const project = { projectId: "proj1" } as any;
    const matches = await FilesProjectSearch(null as any, project, "findme");
    expect(matches).toHaveLength(1);
    expect(matches[0].path).toBe(path.join("included.txt"));
  });

  test("skips binary files containing a NUL byte in their first bytes", async () => {
    await writeProjectFile("text.txt", "findme\n");
    const binaryPath = path.join(testDir, "projects", "proj1", "image.bin");
    await fs.writeFile(binaryPath, Buffer.from([0x00, 0x01, 0x02]), "binary");
    const project = { projectId: "proj1" } as any;
    const matches = await FilesProjectSearch(null as any, project, "findme");
    expect(matches).toHaveLength(1);
    expect(matches[0].path).toBe(path.join("text.txt"));
  });

  test("skips files larger than 1 MB", async () => {
    await writeProjectFile("small.txt", "findme\n");
    await writeProjectFile(
      "large.txt",
      "findme\n" + "x".repeat(1024 * 1024) + "\n",
    );
    const project = { projectId: "proj1" } as any;
    const matches = await FilesProjectSearch(null as any, project, "findme");
    expect(matches).toHaveLength(1);
    expect(matches[0].path).toBe(path.join("small.txt"));
  });

  test("caps results at 200 matches across files", async () => {
    const lines = Array.from({ length: 100 }, (_, i) => `findme line ${i}`);
    await writeProjectFile("a.txt", lines.join("\n"));
    await writeProjectFile("b.txt", lines.join("\n"));
    await writeProjectFile("c.txt", lines.join("\n"));
    const project = { projectId: "proj1" } as any;
    const matches = await FilesProjectSearch(null as any, project, "findme");
    expect(matches).toHaveLength(200);
  });

  test("returns an empty list when nothing matches", async () => {
    await writeProjectFile("a.txt", "content without the term\n");
    const project = { projectId: "proj1" } as any;
    const matches = await FilesProjectSearch(null as any, project, "absent");
    expect(matches).toEqual([]);
  });
});
