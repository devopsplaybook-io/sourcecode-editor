import {
  GitHubMetricsInit,
  GitHubRepoAdded,
  GitProjectClone,
} from "./GitHubMetrics";

// Capture counter .add() calls
const counterAdds = new Map<
  string,
  { value: number; attributes: Record<string, string> }[]
>();

function createMockCounter(name: string) {
  const adds: { value: number; attributes: Record<string, string> }[] = [];
  counterAdds.set(name, adds);
  return {
    add(value: number, attributes: Record<string, string>) {
      adds.push({ value, attributes });
    },
  };
}

const mockMeter = {
  createCounter: (name: string) => createMockCounter(name),
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

beforeEach(() => {
  counterAdds.clear();
});

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
describe("GitHubMetrics", () => {
  describe("GitHubMetricsInit", () => {
    test("should create both counters on init", async () => {
      await GitHubMetricsInit(null as any);

      expect(counterAdds.has("github.repo.added")).toBe(true);
      expect(counterAdds.has("git.project.clone")).toBe(true);
    });
  });

  describe("GitHubRepoAdded", () => {
    test("should increment github.repo.added counter with org and repo attributes", async () => {
      await GitHubMetricsInit(null as any);

      GitHubRepoAdded("myorg", "myrepo");

      const adds = counterAdds.get("github.repo.added");
      expect(adds).toBeDefined();
      expect(adds).toHaveLength(1);
      expect(adds![0]).toEqual({
        value: 1,
        attributes: { org: "myorg", repo: "myrepo" },
      });
    });

    test("should allow multiple increments", async () => {
      await GitHubMetricsInit(null as any);

      GitHubRepoAdded("org1", "repo1");
      GitHubRepoAdded("org1", "repo2");
      GitHubRepoAdded("org2", "repo1");

      const adds = counterAdds.get("github.repo.added");
      expect(adds).toBeDefined();
      expect(adds).toHaveLength(3);
      expect(adds![0]).toEqual({
        value: 1,
        attributes: { org: "org1", repo: "repo1" },
      });
      expect(adds![1]).toEqual({
        value: 1,
        attributes: { org: "org1", repo: "repo2" },
      });
      expect(adds![2]).toEqual({
        value: 1,
        attributes: { org: "org2", repo: "repo1" },
      });
    });
  });

  describe("GitProjectClone", () => {
    test("should increment git.project.clone counter with projectId attribute", async () => {
      await GitHubMetricsInit(null as any);

      GitProjectClone("project-abc-123");

      const adds = counterAdds.get("git.project.clone");
      expect(adds).toBeDefined();
      expect(adds).toHaveLength(1);
      expect(adds![0]).toEqual({
        value: 1,
        attributes: { projectId: "project-abc-123" },
      });
    });

    test("should allow multiple clone increments", async () => {
      await GitHubMetricsInit(null as any);

      GitProjectClone("proj-1");
      GitProjectClone("proj-2");

      const adds = counterAdds.get("git.project.clone");
      expect(adds).toHaveLength(2);
    });
  });
});
