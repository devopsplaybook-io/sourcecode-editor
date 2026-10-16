import { describe, expect, it } from "vitest";
import { FuzzyFilterPaths, FuzzyScorePath } from "./FuzzySearch";

describe("FuzzyScorePath", () => {
  it("matches a query as a case-insensitive subsequence", () => {
    expect(FuzzyScorePath("src/main.ts", "MAIN")).not.toBeNull();
    expect(FuzzyScorePath("src/main.ts", "smt")).not.toBeNull();
  });

  it("returns null when the query is not a subsequence", () => {
    expect(FuzzyScorePath("src/main.ts", "xyz")).toBeNull();
  });

  it("returns 0 for an empty query", () => {
    expect(FuzzyScorePath("src/main.ts", "")).toBe(0);
  });

  it("scores boundary and consecutive matches higher than scattered ones", () => {
    const boundary = FuzzyScorePath("src/main.ts", "main");
    const scattered = FuzzyScorePath("src/remain.tsx", "main");
    expect(boundary).not.toBeNull();
    expect(scattered).not.toBeNull();
    expect(boundary as number).toBeGreaterThan(scattered as number);
  });
});

describe("FuzzyFilterPaths", () => {
  const paths = [
    "src/main.ts",
    "src/App.vue",
    "src/components/EditorTabs.vue",
    "tests/main.spec.ts",
  ];

  it("returns the first paths up to the limit for an empty query", () => {
    expect(FuzzyFilterPaths(paths, "", 2)).toEqual([
      "src/main.ts",
      "src/App.vue",
    ]);
  });

  it("filters out non-matching paths", () => {
    expect(FuzzyFilterPaths(paths, "main")).toEqual([
      "src/main.ts",
      "tests/main.spec.ts",
    ]);
    expect(FuzzyFilterPaths(paths, "tabs")).toEqual([
      "src/components/EditorTabs.vue",
    ]);
  });

  it("is case-insensitive", () => {
    expect(FuzzyFilterPaths(paths, "APP")).toEqual(["src/App.vue"]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(FuzzyFilterPaths(paths, "zzz")).toEqual([]);
  });

  it("limits the number of results", () => {
    expect(FuzzyFilterPaths(paths, "s", 2)).toHaveLength(2);
  });
});
