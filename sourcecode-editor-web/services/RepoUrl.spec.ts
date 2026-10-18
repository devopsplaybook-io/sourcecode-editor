import { describe, expect, it } from "vitest";
import {
  RepoUrlIsValid,
  RepoUrlNameFromUrl,
  RepoUrlOwnerRepoFromUrl,
} from "./RepoUrl";

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

describe("RepoUrlOwnerRepoFromUrl", () => {
  it("parses https URLs with and without .git", () => {
    expect(RepoUrlOwnerRepoFromUrl("https://github.com/owner/repo.git")).toEqual(
      { owner: "owner", repo: "repo" },
    );
    expect(RepoUrlOwnerRepoFromUrl("https://github.com/owner/repo")).toEqual({
      owner: "owner",
      repo: "repo",
    });
    expect(RepoUrlOwnerRepoFromUrl("http://github.com/owner/repo")).toEqual({
      owner: "owner",
      repo: "repo",
    });
  });

  it("parses scp-like URLs", () => {
    expect(RepoUrlOwnerRepoFromUrl("git@github.com:owner/repo.git")).toEqual({
      owner: "owner",
      repo: "repo",
    });
    expect(RepoUrlOwnerRepoFromUrl("git@github.com:owner/repo")).toEqual({
      owner: "owner",
      repo: "repo",
    });
  });

  it("parses ssh:// URLs with optional port", () => {
    expect(RepoUrlOwnerRepoFromUrl("ssh://git@github.com/owner/repo.git")).toEqual(
      { owner: "owner", repo: "repo" },
    );
    expect(
      RepoUrlOwnerRepoFromUrl("ssh://git@github.com:2222/owner/repo.git"),
    ).toEqual({ owner: "owner", repo: "repo" });
  });

  it("strips trailing slashes", () => {
    expect(RepoUrlOwnerRepoFromUrl("https://github.com/owner/repo/")).toEqual({
      owner: "owner",
      repo: "repo",
    });
  });

  it("returns null for non-GitHub hosts", () => {
    expect(RepoUrlOwnerRepoFromUrl("https://gitlab.com/owner/repo.git")).toBe(
      null,
    );
    expect(RepoUrlOwnerRepoFromUrl("git@gitlab.com:owner/repo.git")).toBe(null);
    expect(RepoUrlOwnerRepoFromUrl("ssh://git@gitlab.com/owner/repo.git")).toBe(
      null,
    );
  });

  it("returns null for garbage input", () => {
    expect(RepoUrlOwnerRepoFromUrl("")).toBe(null);
    expect(RepoUrlOwnerRepoFromUrl("   ")).toBe(null);
    expect(RepoUrlOwnerRepoFromUrl("github.com/owner/repo")).toBe(null);
    expect(RepoUrlOwnerRepoFromUrl("https://github.com/justone")).toBe(null);
    expect(RepoUrlOwnerRepoFromUrl("/local/path/repo")).toBe(null);
  });
});
