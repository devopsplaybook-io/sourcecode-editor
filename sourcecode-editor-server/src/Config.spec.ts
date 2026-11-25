import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  AuthSessionPolicyCheck,
  AuthSessionPolicyLog,
  ConfigBase,
} from "@devopsplaybook.io/common-utils";
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
  describe("session configuration", () => {
    const ENV_KEYS = [
      "JWT_VALIDITY_DURATION",
      "JWT_SESSION_MAX_DURATION",
      "GITHUB_TOKEN",
      "GITHUB_TOKENS",
    ];
    const savedEnv: Record<string, string | undefined> = {};
    let tmpDir: string;

    beforeEach(() => {
      for (const key of ENV_KEYS) {
        savedEnv[key] = process.env[key];
        delete process.env[key];
      }
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sce-config-"));
    });

    afterEach(() => {
      for (const key of ENV_KEYS) {
        if (savedEnv[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = savedEnv[key];
        }
      }
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    function newConfig(): Config {
      const config = new Config();
      config.CONFIG_FILE = path.join(tmpDir, "config.json");
      return config;
    }

    test("reload keeps the 30-day validity and 90-day cap", async () => {
      const config = newConfig();
      await config.reload();

      expect(config.JWT_VALIDITY_DURATION).toBe(2592000);
      expect(config.JWT_SESSION_MAX_DURATION).toBe(7776000);
    });

    test("reload does not restore a library default after the values were used", async () => {
      const config = newConfig();
      await config.reload();
      await config.reload();

      expect(config.JWT_VALIDITY_DURATION).toBe(2592000);
      expect(config.JWT_SESSION_MAX_DURATION).toBe(7776000);
    });

    test("matches the documented auth session policy", async () => {
      const config = newConfig();
      await config.reload();

      const result = AuthSessionPolicyCheck(config, {
        app: "sourcecode-editor",
      });
      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("logs the intended values and the policy line at startup", async () => {
      const config = newConfig();
      const lines: string[] = [];
      // The Config wrapper hard-codes its logger; call the base reload to
      // capture the same configuration lines the app logs at startup.
      await ConfigBase.prototype.reload.call(config, (message: string) =>
        lines.push(message),
      );
      AuthSessionPolicyLog(config, {
        app: "sourcecode-editor",
        logger: (message) => lines.push(message),
      });

      expect(lines).toContain(
        "Configuration Value: JWT_VALIDITY_DURATION: 2592000 (from defaults)",
      );
      expect(lines).toContain(
        "Configuration Value: JWT_SESSION_MAX_DURATION: 7776000 (from defaults)",
      );
      expect(lines).toContain(
        "Auth session policy: app=sourcecode-editor validity=2592000s cap=7776000s renewal=sliding status=ok",
      );
    });

    test("reports an error line for a regressed configuration", async () => {
      process.env.JWT_VALIDITY_DURATION = "60";
      const config = newConfig();
      const lines: string[] = [];
      await config.reload();
      const result = AuthSessionPolicyLog(config, {
        app: "sourcecode-editor",
        logger: (message) => lines.push(message),
      });

      expect(result.ok).toBe(false);
      expect(lines[0]).toContain("status=error");
      expect(
        lines.some((line) => line.startsWith("Auth session policy error:")),
      ).toBe(true);
    });

    test("environment values override the defaults", async () => {
      process.env.JWT_VALIDITY_DURATION = "3600";
      process.env.JWT_SESSION_MAX_DURATION = "7200";
      const config = newConfig();
      await config.reload();

      expect(config.JWT_VALIDITY_DURATION).toBe(3600);
      expect(config.JWT_SESSION_MAX_DURATION).toBe(7200);
    });
  });

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
