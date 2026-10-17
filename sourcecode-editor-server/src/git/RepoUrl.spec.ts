import { RepoUrlIsValid, RepoUrlNameFromUrl } from "./RepoUrl";

describe("RepoUrlIsValid", () => {
  test("accepts https and http URLs", () => {
    expect(RepoUrlIsValid("https://github.com/owner/repo.git")).toBe(true);
    expect(RepoUrlIsValid("http://example.com/repo")).toBe(true);
    expect(RepoUrlIsValid("https://example.com:8443/owner/repo.git")).toBe(
      true,
    );
  });

  test("accepts ssh:// URLs with or without port and user", () => {
    expect(RepoUrlIsValid("ssh://github.com/owner/repo.git")).toBe(true);
    expect(RepoUrlIsValid("ssh://git@github.com/owner/repo.git")).toBe(true);
    expect(RepoUrlIsValid("ssh://git@github.com:2222/owner/repo.git")).toBe(
      true,
    );
  });

  test("accepts scp-like URLs", () => {
    expect(RepoUrlIsValid("git@github.com:owner/repo.git")).toBe(true);
    expect(RepoUrlIsValid("git@github.com:owner/repo")).toBe(true);
  });

  test("accepts URLs with surrounding whitespace", () => {
    expect(RepoUrlIsValid("  https://github.com/owner/repo.git  ")).toBe(true);
  });

  test("rejects empty or non-string URLs", () => {
    expect(RepoUrlIsValid("")).toBe(false);
    expect(RepoUrlIsValid("   ")).toBe(false);
    expect(RepoUrlIsValid(undefined)).toBe(false);
    expect(RepoUrlIsValid(null)).toBe(false);
    expect(RepoUrlIsValid(42)).toBe(false);
  });

  test("rejects URLs without a known scheme", () => {
    expect(RepoUrlIsValid("github.com/owner/repo")).toBe(false);
    expect(RepoUrlIsValid("ftp://example.com/repo")).toBe(false);
    expect(RepoUrlIsValid("/local/path/repo")).toBe(false);
  });

  test("rejects URLs containing shell metacharacters", () => {
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
  test("derives the name from the last path segment", () => {
    expect(RepoUrlNameFromUrl("https://github.com/owner/repo.git")).toBe(
      "repo",
    );
    expect(RepoUrlNameFromUrl("https://github.com/owner/repo")).toBe("repo");
    expect(RepoUrlNameFromUrl("ssh://git@github.com/owner/repo.git")).toBe(
      "repo",
    );
    expect(RepoUrlNameFromUrl("git@github.com:owner/repo.git")).toBe("repo");
  });

  test("strips trailing slashes and the .git suffix", () => {
    expect(RepoUrlNameFromUrl("https://github.com/owner/repo/")).toBe("repo");
    expect(RepoUrlNameFromUrl("https://github.com/owner/repo.git/")).toBe(
      "repo",
    );
  });

  test("returns empty for empty or non-string URLs", () => {
    expect(RepoUrlNameFromUrl("")).toBe("");
    expect(RepoUrlNameFromUrl("   ")).toBe("");
    expect(RepoUrlNameFromUrl(undefined)).toBe("");
  });
});
