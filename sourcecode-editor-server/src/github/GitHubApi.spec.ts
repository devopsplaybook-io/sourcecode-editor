import axios from "axios";
import {
  GitHubSetToken,
  GitHubIsEnabled,
  GitHubGetRepoInfo,
} from "./GitHubApi";

// Mock axios to avoid real HTTP calls
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("GitHubApi", () => {
  beforeEach(() => {
    // Reset token before each test
    GitHubSetToken("");
    jest.clearAllMocks();
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

  describe("GitHubGetRepoInfo", () => {
    test("should fetch repo info from the correct GitHub API URL", async () => {
      GitHubSetToken("ghp_test_token");
      const mockRepoData = {
        id: 12345,
        name: "my-repo",
        full_name: "myorg/my-repo",
        description: "A test repository",
        html_url: "https://github.com/myorg/my-repo",
        ssh_url: "git@github.com:myorg/my-repo.git",
        clone_url: "https://github.com/myorg/my-repo.git",
        default_branch: "main",
        owner: { login: "myorg" },
        private: false,
      };
      mockedAxios.get.mockResolvedValue({ data: mockRepoData });

      const result = await GitHubGetRepoInfo("myorg", "my-repo");

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "https://api.github.com/repos/myorg/my-repo",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer ghp_test_token",
          }),
        }),
      );
      expect(result).toEqual(mockRepoData);
      expect(result.name).toBe("my-repo");
      expect(result.owner.login).toBe("myorg");
    });

    test("should propagate HTTP errors from GitHub API", async () => {
      GitHubSetToken("ghp_test_token");
      const httpError = new Error("Request failed with status code 404");
      mockedAxios.get.mockRejectedValue(httpError);

      await expect(GitHubGetRepoInfo("nonexistent", "repo")).rejects.toThrow(
        "Request failed with status code 404",
      );
    });
  });
});
