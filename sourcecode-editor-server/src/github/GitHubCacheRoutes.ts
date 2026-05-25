import { FastifyInstance } from "fastify";
import * as fse from "fs-extra";
import * as path from "path";
import { AuthGetUserSession } from "../users/Auth";
import { Config } from "../Config";
import { OTelLogger } from "../OTelContext";
import { GitHubIsEnabled } from "./GitHubApi";
import {
  getWatchedRepos,
  addWatchedRepo,
  removeWatchedRepo,
} from "./WatchedRepos";
import { GitHubCacheRefresh, GitHubCacheRefreshSingle } from "./GitHubCache";

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

    // GET watched repos - returns full data for all watched repos
    fastify.get("/watched", async (req, res) => {
      if (!(await AuthGetUserSession(req)).isAuthenticated) {
        return res.status(403).send({ error: "Access Denied" });
      }
      if (!GitHubIsEnabled()) {
        return res.status(501).send({ error: "GitHub Not Enabled" });
      }
      try {
        const watchedRepos = await getWatchedRepos();
        const reposDir = path.join(cacheDir, "repos");
        const pullsDir = path.join(cacheDir, "pulls");
        const actionsDir = path.join(cacheDir, "actions");
        const branchesDir = path.join(cacheDir, "branches");

        const entries: Record<string, unknown>[] = [];
        for (const watched of watchedRepos) {
          const { org, repo } = watched;

          // Read repo info from per-repo file
          let repoInfo: Record<string, unknown> | null = null;
          const repoInfoPath = path.join(reposDir, org, `${repo}.json`);
          if (await fse.pathExists(repoInfoPath)) {
            try {
              repoInfo = await fse.readJson(repoInfoPath);
            } catch {
              repoInfo = null;
            }
          }

          // Read pulls
          let pulls: unknown[] = [];
          const pullsPath = path.join(pullsDir, org, `${repo}.json`);
          if (await fse.pathExists(pullsPath)) {
            try {
              pulls = await fse.readJson(pullsPath);
            } catch {
              pulls = [];
            }
          }

          // Read actions
          let actions: unknown[] = [];
          const actionsPath = path.join(actionsDir, org, `${repo}.json`);
          if (await fse.pathExists(actionsPath)) {
            try {
              actions = await fse.readJson(actionsPath);
            } catch {
              actions = [];
            }
          }

          // Read branches
          let branches = 0;
          const branchesPath = path.join(branchesDir, org, `${repo}.json`);
          if (await fse.pathExists(branchesPath)) {
            try {
              const branchData = await fse.readJson(branchesPath);
              branches = branchData.count || 0;
            } catch {
              branches = 0;
            }
          }

          entries.push({
            org,
            repo,
            repoInfo,
            pulls,
            actions,
            branches,
            expanded: false,
            actionsExpanded: false,
          });
        }

        return res.status(200).send({ entries });
      } catch (err) {
        logger.error("Failed to get watched repos", err);
        return res.status(502).send({ error: "Cache Read Error" });
      }
    });

    // POST add repo to watch list
    fastify.post<{ Body: { org: string; repo: string } }>(
      "/watched",
      async (req, res) => {
        if (!(await AuthGetUserSession(req)).isAuthenticated) {
          return res.status(403).send({ error: "Access Denied" });
        }
        if (!GitHubIsEnabled()) {
          return res.status(501).send({ error: "GitHub Not Enabled" });
        }
        if (!req.body.org || !req.body.repo) {
          return res.status(400).send({ error: "Missing: org, repo" });
        }
        try {
          await addWatchedRepo(req.body.org, req.body.repo);
          // Trigger cache refresh to fetch data for this repo
          await GitHubCacheRefresh(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            null as any,
          );
          return res.status(201).send({});
        } catch (err) {
          logger.error("Failed to add watched repo", err);
          return res.status(502).send({ error: "Failed to add watched repo" });
        }
      },
    );

    // DELETE remove repo from watch list
    fastify.delete<{ Params: { owner: string; repo: string } }>(
      "/watched/:owner/:repo",
      async (req, res) => {
        if (!(await AuthGetUserSession(req)).isAuthenticated) {
          return res.status(403).send({ error: "Access Denied" });
        }
        if (!GitHubIsEnabled()) {
          return res.status(501).send({ error: "GitHub Not Enabled" });
        }
        try {
          await removeWatchedRepo(req.params.owner, req.params.repo);
          return res.status(200).send({});
        } catch (err) {
          logger.error("Failed to remove watched repo", err);
          return res
            .status(502)
            .send({ error: "Failed to remove watched repo" });
        }
      },
    );

    // POST refresh actions for a specific repo
    fastify.post<{ Params: { owner: string; repo: string } }>(
      "/actions/refresh/:owner/:repo",
      async (req, res) => {
        if (!(await AuthGetUserSession(req)).isAuthenticated) {
          return res.status(403).send({ error: "Access Denied" });
        }
        if (!GitHubIsEnabled()) {
          return res.status(501).send({ error: "GitHub Not Enabled" });
        }
        try {
          await GitHubCacheRefreshSingle(req.params.owner, req.params.repo);
          return res.status(200).send({});
        } catch (err) {
          logger.error("Failed to refresh actions", err);
          return res.status(502).send({ error: "Failed to refresh actions" });
        }
      },
    );

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
  }
}
