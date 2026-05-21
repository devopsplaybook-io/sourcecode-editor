import { FastifyInstance } from "fastify";
import * as fse from "fs-extra";
import * as path from "path";
import { AuthGetUserSession } from "../users/Auth";
import { Config } from "../Config";
import { OTelLogger } from "../OTelContext";
import { GitHubIsEnabled } from "./GitHubApi";

const logger = OTelLogger().createModuleLogger("GitHubCacheRoutes");

export class GitHubCacheRoutes {
  public async getRoutes(
    fastify: FastifyInstance,
    config: Config,
  ): Promise<void> {
    const cacheDir = path.join(config.DATA_DIR, "github");

    // Health/status check
    fastify.get("/", async (req, res) => {
      return res.status(200).send({ enabled: GitHubIsEnabled() });
    });

    // List all cached repos grouped by organization
    fastify.get("/repos", async (req, res) => {
      if (!(await AuthGetUserSession(req)).isAuthenticated) {
        return res.status(403).send({ error: "Access Denied" });
      }
      if (!GitHubIsEnabled()) {
        return res.status(501).send({ error: "GitHub Not Enabled" });
      }
      try {
        const reposPath = path.join(cacheDir, "repos.json");
        if (!(await fse.pathExists(reposPath))) {
          return res.status(200).send({ organizations: {} });
        }
        const organizations = await fse.readJson(reposPath);
        return res.status(200).send({ organizations });
      } catch (err) {
        logger.error("Failed to read cached GitHub repos", err);
        return res.status(502).send({ error: "Cache Read Error" });
      }
    });

    // List cached PRs for a repo
    fastify.get<{ Params: { owner: string; repo: string } }>(
      "/pulls/:owner/:repo",
      async (req, res) => {
        if (!(await AuthGetUserSession(req)).isAuthenticated) {
          return res.status(403).send({ error: "Access Denied" });
        }
        if (!GitHubIsEnabled()) {
          return res.status(501).send({ error: "GitHub Not Enabled" });
        }
        try {
          const pullsPath = path.join(
            cacheDir,
            "pulls",
            req.params.owner,
            `${req.params.repo}.json`,
          );
          if (!(await fse.pathExists(pullsPath))) {
            return res.status(200).send({ pulls: [] });
          }
          const pulls = await fse.readJson(pullsPath);
          return res.status(200).send({ pulls });
        } catch (err) {
          logger.error("Failed to read cached pulls", err);
          return res.status(502).send({ error: "Cache Read Error" });
        }
      },
    );

    // Get cached latest actions for a repo
    fastify.get<{ Params: { owner: string; repo: string } }>(
      "/actions/:owner/:repo",
      async (req, res) => {
        if (!(await AuthGetUserSession(req)).isAuthenticated) {
          return res.status(403).send({ error: "Access Denied" });
        }
        if (!GitHubIsEnabled()) {
          return res.status(501).send({ error: "GitHub Not Enabled" });
        }
        try {
          const actionsPath = path.join(
            cacheDir,
            "actions",
            req.params.owner,
            `${req.params.repo}.json`,
          );
          if (!(await fse.pathExists(actionsPath))) {
            return res.status(200).send({ runs: [] });
          }
          const runs = await fse.readJson(actionsPath);
          return res.status(200).send({ runs });
        } catch (err) {
          logger.error("Failed to read cached actions", err);
          return res.status(502).send({ error: "Cache Read Error" });
        }
      },
    );

    // Get last refresh timestamp
    fastify.get("/timestamp", async (req, res) => {
      if (!(await AuthGetUserSession(req)).isAuthenticated) {
        return res.status(403).send({ error: "Access Denied" });
      }
      try {
        const metaPath = path.join(cacheDir, "meta.json");
        if (!(await fse.pathExists(metaPath))) {
          return res.status(200).send({ lastUpdated: 0 });
        }
        const meta = await fse.readJson(metaPath);
        return res.status(200).send({ lastUpdated: meta.lastUpdated });
      } catch (err) {
        logger.error("Failed to read cache meta", err);
        return res.status(502).send({ error: "Cache Read Error" });
      }
    });

    // Get activity timestamps for all repos
    fastify.get("/activity", async (req, res) => {
      if (!(await AuthGetUserSession(req)).isAuthenticated) {
        return res.status(403).send({ error: "Access Denied" });
      }
      try {
        const activityPath = path.join(cacheDir, "activity.json");
        if (!(await fse.pathExists(activityPath))) {
          return res.status(200).send({ activity: [] });
        }
        const activity = await fse.readJson(activityPath);
        return res.status(200).send({ activity });
      } catch (err) {
        logger.error("Failed to read activity data", err);
        return res.status(502).send({ error: "Cache Read Error" });
      }
    });
  }
}
