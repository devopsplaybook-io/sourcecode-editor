import axios from "axios";
import {
  GitHubSetTokens,
  GitHubIsEnabled,
  GitHubGetRepoInfo,
  GitHubListRepos,
  GitHubRepo,
} from "./GitHubApi";

// Mock axios to avoid real HTTP calls
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

function makeRepo(
  id: number,
  name: string,
  org: string,
): GitHubRepo {
  return {
    id,
    name,
    full_name: `${org}/${name}`,
    description: null,
    html_url: `https://github.com/${org}/${name}`,
    ssh_url: `git@github.com:${org}/${name}.git`,
    clone_url: `https://github.com/${org}/${name}.git`,
    default_branch: "main",
    owner: { login: org },
    private: false,
  };
}

function httpError(status: number): Error & { response: { status: number } } {
  const err = new Error(
    `Request failed with status code ${status}`,
  ) as Error & { response: { status: number } };
  err.response = { status };
  return err;
}

function authHeaders(): string[] {
  return mockedAxios.get.mock.calls.map((call) => {
    const config = call[1] as { headers: { Authorization: string } };
    return config.headers.Authorization;
  });
}

describe("GitHubApi", () => {
  beforeEach(() => {
    // Reset tokens before each test
    GitHubSetTokens([]);
    jest.clearAllMocks();
  });

  describe("GitHubSetTokens / GitHubIsEnabled", () => {
    test("should be disabled when token list is empty", () => {
      GitHubSetTokens([]);
      expect(GitHubIsEnabled()).toBe(false);
    });

    test("should be enabled when at least one token is set", () => {
      GitHubSetTokens(["ghp_test123token"]);
      expect(GitHubIsEnabled()).toBe(true);
    });

    test("should be enabled with multiple tokens", () => {
      GitHubSetTokens(["ghp_token_a", "ghp_token_b"]);
      expect(GitHubIsEnabled()).toBe(true);
    });

    test("should become disabled when tokens are cleared", () => {
      GitHubSetTokens(["ghp_test123token"]);
      expect(GitHubIsEnabled()).toBe(true);
      GitHubSetTokens([]);
      expect(GitHubIsEnabled()).toBe(false);
    });
  });

  describe("GitHubGetRepoInfo", () => {
    test("should fetch repo info with the first token", async () => {
      GitHubSetTokens(["ghp_test_token"]);
      const mockRepoData = makeRepo(12345, "my-repo", "myorg");
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
      GitHubSetTokens(["ghp_test_token"]);
      mockedAxios.get.mockRejectedValue(new Error("Request failed"));

      await expect(GitHubGetRepoInfo("nonexistent", "repo")).rejects.toThrow(
        "Request failed",
      );
    });

    test("should fall back to the next token on 404 and cache the winner", async () => {
      GitHubSetTokens(["ghp_token_a", "ghp_token_b"]);
      const repoData = makeRepo(1, "repo", "fallbackorg");
      mockedAxios.get
        .mockRejectedValueOnce(httpError(404))
        .mockResolvedValueOnce({ data: repoData });

      const result = await GitHubGetRepoInfo("fallbackorg", "repo");

      expect(result).toEqual(repoData);
      expect(authHeaders()).toEqual([
        "Bearer ghp_token_a",
        "Bearer ghp_token_b",
      ]);

      // Subsequent calls use the cached winning token only.
      mockedAxios.get.mockResolvedValueOnce({ data: repoData });
      await GitHubGetRepoInfo("fallbackorg", "repo");
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
      expect(authHeaders()[2]).toBe("Bearer ghp_token_b");
    });

    test("should fall back on 401 and 403", async () => {
      GitHubSetTokens(["ghp_token_a", "ghp_token_b"]);
      const repoData = makeRepo(2, "repo", "authorg");

      mockedAxios.get
        .mockRejectedValueOnce(httpError(401))
        .mockResolvedValueOnce({ data: repoData });
      await expect(GitHubGetRepoInfo("authorg", "repo")).resolves.toEqual(
        repoData,
      );
      expect(authHeaders()).toEqual([
        "Bearer ghp_token_a",
        "Bearer ghp_token_b",
      ]);

      jest.clearAllMocks();
      GitHubSetTokens(["ghp_token_a", "ghp_token_b"]);
      mockedAxios.get
        .mockRejectedValueOnce(httpError(403))
        .mockResolvedValueOnce({ data: repoData });
      await expect(GitHubGetRepoInfo("authorg2", "repo")).resolves.toEqual(
        repoData,
      );
      expect(authHeaders()).toEqual([
        "Bearer ghp_token_a",
        "Bearer ghp_token_b",
      ]);
    });

    test("should not fall back on non-auth errors", async () => {
      GitHubSetTokens(["ghp_token_a", "ghp_token_b"]);
      mockedAxios.get.mockRejectedValueOnce(httpError(500));

      await expect(GitHubGetRepoInfo("servererror", "repo")).rejects.toThrow(
        "Request failed with status code 500",
      );
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(authHeaders()).toEqual(["Bearer ghp_token_a"]);
    });

    test("should propagate the last error when no token can access the owner", async () => {
      GitHubSetTokens(["ghp_token_a", "ghp_token_b"]);
      mockedAxios.get
        .mockRejectedValueOnce(httpError(404))
        .mockRejectedValueOnce(httpError(401));

      await expect(GitHubGetRepoInfo("inaccessible", "repo")).rejects.toThrow(
        "Request failed with status code 401",
      );
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });

  describe("GitHubListRepos", () => {
    test("should merge repos from multiple tokens and dedupe by repo id", async () => {
      GitHubSetTokens(["ghp_token_a", "ghp_token_b"]);
      const repo1 = makeRepo(1, "repo-one", "org1");
      const repo2 = makeRepo(2, "repo-two", "org2");
      const repo2Duplicate = makeRepo(2, "repo-two", "org2");
      const repo3 = makeRepo(3, "repo-three", "org3");

      mockedAxios.get
        // token A: page 1, then empty page
        .mockResolvedValueOnce({ data: [repo1, repo2] })
        .mockResolvedValueOnce({ data: [] })
        // token B: page 1 (repo2 duplicate + new org), then empty page
        .mockResolvedValueOnce({ data: [repo2Duplicate, repo3] })
        .mockResolvedValueOnce({ data: [] });

      const orgs = await GitHubListRepos();

      expect(Object.keys(orgs).sort()).toEqual(["org1", "org2", "org3"]);
      expect(orgs["org1"]).toEqual([repo1]);
      expect(orgs["org2"]).toEqual([repo2]);
      expect(orgs["org3"]).toEqual([repo3]);

      expect(mockedAxios.get).toHaveBeenCalledTimes(4);
      expect(authHeaders()).toEqual([
        "Bearer ghp_token_a",
        "Bearer ghp_token_a",
        "Bearer ghp_token_b",
        "Bearer ghp_token_b",
      ]);
    });

    test("should return empty orgs when no tokens are configured", async () => {
      GitHubSetTokens([]);
      const orgs = await GitHubListRepos();
      expect(orgs).toEqual({});
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });
});
