import { Config, ConfigGitHubTokens } from "./Config";

jest.mock("./OTelContext", () => ({
  OTelLogger: () => ({
    createModuleLogger: () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  }),
}));

/* eslint-disable @typescript-eslint/no-explicit-any */

describe("Config", () => {
  describe("GITHUB_TOKENS field", () => {
    test("should default to an empty array", () => {
      const config = new Config();
      expect(config.GITHUB_TOKEN).toBe("");
      expect(Array.isArray(config.GITHUB_TOKENS)).toBe(true);
      expect(config.GITHUB_TOKENS).toEqual([]);
    });
  });

  describe("ConfigGitHubTokens", () => {
    test("should return an empty list when no tokens are configured", () => {
      const config = { GITHUB_TOKEN: "", GITHUB_TOKENS: [] } as any;
      expect(ConfigGitHubTokens(config)).toEqual([]);
    });

    test("should return the legacy token only", () => {
      const config = { GITHUB_TOKEN: "ghp_legacy", GITHUB_TOKENS: [] } as any;
      expect(ConfigGitHubTokens(config)).toEqual(["ghp_legacy"]);
    });

    test("should merge legacy token and token list in order", () => {
      const config = {
        GITHUB_TOKEN: "ghp_legacy",
        GITHUB_TOKENS: ["ghp_org", "ghp_personal"],
      } as any;
      expect(ConfigGitHubTokens(config)).toEqual([
        "ghp_legacy",
        "ghp_org",
        "ghp_personal",
      ]);
    });

    test("should drop empty entries and duplicates", () => {
      const config = {
        GITHUB_TOKEN: "ghp_legacy",
        GITHUB_TOKENS: ["", "ghp_org", "ghp_legacy", "ghp_org", ""],
      } as any;
      expect(ConfigGitHubTokens(config)).toEqual(["ghp_legacy", "ghp_org"]);
    });

    test("should work when only GITHUB_TOKENS is set", () => {
      const config = {
        GITHUB_TOKEN: "",
        GITHUB_TOKENS: ["ghp_org", "ghp_personal"],
      } as any;
      expect(ConfigGitHubTokens(config)).toEqual(["ghp_org", "ghp_personal"]);
    });

    test("should treat a non-array GITHUB_TOKENS as a single token", () => {
      // ConfigBase returns the raw string when the env value is not JSON.
      const config = {
        GITHUB_TOKEN: "",
        GITHUB_TOKENS: "ghp_plain_env_token",
      } as any;
      expect(ConfigGitHubTokens(config)).toEqual(["ghp_plain_env_token"]);
    });

    test("should tolerate a missing GITHUB_TOKENS property", () => {
      const config = { GITHUB_TOKEN: "ghp_legacy" } as any;
      expect(ConfigGitHubTokens(config)).toEqual(["ghp_legacy"]);
    });
  });
});
