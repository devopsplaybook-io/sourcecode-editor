import { GitHubSetToken, GitHubIsEnabled } from "./GitHubApi";

describe("GitHubApi", () => {
  beforeEach(() => {
    // Reset token before each test
    GitHubSetToken("");
  });

  describe("GitHubSetToken / GitHubIsEnabled", () => {
    test("should be disabled when token is empty", () => {
      GitHubSetToken("");
      expect(GitHubIsEnabled()).toBe(false);
    });

    test("should be enabled when token is set", () => {
      GitHubSetToken("ghp_test123token");
      expect(GitHubIsEnabled()).toBe(true);
    });

    test("should be enabled when token is a non-empty string", () => {
      GitHubSetToken("any_non_empty_string");
      expect(GitHubIsEnabled()).toBe(true);
    });

    test("should become disabled when token is cleared", () => {
      GitHubSetToken("ghp_test123token");
      expect(GitHubIsEnabled()).toBe(true);
      GitHubSetToken("");
      expect(GitHubIsEnabled()).toBe(false);
    });
  });
});
