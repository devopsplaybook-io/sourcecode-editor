import { describe, expect, it } from "vitest";
import { RepoUrlIsValid, RepoUrlNameFromUrl } from "./RepoUrl";

describe("RepoUrlIsValid", () => {
  it("accepts https, ssh and scp-like URLs", () => {
    expect(RepoUrlIsValid("https://github.com/owner/repo.git")).toBe(true);
    expect(RepoUrlIsValid("http://example.com/repo")).toBe(true);
    expect(RepoUrlIsValid("ssh://git@github.com/owner/repo.git")).toBe(true);
    expect(RepoUrlIsValid("ssh://git@github.com:2222/owner/repo.git")).toBe(
      true,
    );
    expect(RepoUrlIsValid("git@github.com:owner/repo.git")).toBe(true);
  });

  it("accepts URLs with surrounding whitespace", () => {
    expect(RepoUrlIsValid("  https://github.com/owner/repo.git  ")).toBe(true);
  });

  it("rejects empty or malformed URLs", () => {
    expect(RepoUrlIsValid("")).toBe(false);
    expect(RepoUrlIsValid("   ")).toBe(false);
    expect(RepoUrlIsValid("github.com/owner/repo")).toBe(false);
    expect(RepoUrlIsValid("ftp://example.com/repo")).toBe(false);
    expect(RepoUrlIsValid("/local/path/repo")).toBe(false);
  });

  it("rejects URLs containing shell metacharacters", () => {
    expect(RepoUrlIsValid("https://example.com/repo.git; rm -rf /")).toBe(
      false,
    );
    expect(RepoUrlIsValid("https://example.com/repo.git && echo pwned")).toBe(
      false,
    );
    expect(RepoUrlIsValid("https://$(id)@example.com/repo")).toBe(false);
    expect(RepoUrlIsValid("git@github.com:owner/repo.git`id`")).toBe(false);
    expect(RepoUrlIsValid("git@github.com:owner/repo.git|id")).toBe(false);
  });
});

describe("RepoUrlNameFromUrl", () => {
  it("derives the name from the last path segment without .git", () => {
    expect(RepoUrlNameFromUrl("https://github.com/owner/repo.git")).toBe(
      "repo",
    );
    expect(RepoUrlNameFromUrl("https://github.com/owner/repo")).toBe("repo");
    expect(RepoUrlNameFromUrl("git@github.com:owner/repo.git")).toBe("repo");
  });

  it("strips trailing slashes", () => {
    expect(RepoUrlNameFromUrl("https://github.com/owner/repo/")).toBe("repo");
  });

  it("returns empty for empty URLs", () => {
    expect(RepoUrlNameFromUrl("")).toBe("");
    expect(RepoUrlNameFromUrl("   ")).toBe("");
  });
});
