import { FastifyInstance } from "fastify";
import { AuthGetUserSession } from "../users/Auth";
import { Config } from "../Config";
import { Project } from "../model/Project";
import { ProjectsDataAdd } from "../projects/ProjectsData";
import { ProjectsSyncStartProject } from "../projects/ProjectsSync";
import { GitClone } from "../git/Git";
import { EventBusEmit } from "../events/EventBus";
import { RepositoryEventTypes } from "../events/RepositoryEventTypes";
import { OTelLogger, OTelTracer } from "../OTelContext";
import {
  GitHubIsEnabled,
  GitHubListRepos,
  GitHubListPulls,
  GitHubGetLatestActions,
  GitHubCreatePull,
  GitHubMergePull,
  GitHubSetToken,
} from "./GitHubApi";

const logger = OTelLogger().createModuleLogger("GitHubRoutes");

export class GitHubRoutes {
  public async getRoutes(
    fastify: FastifyInstance,
    config: Config,
  ): Promise<void> {
    // Ensure token is synced from config
    if (config.GITHUB_TOKEN) {
      GitHubSetToken(config.GITHUB_TOKEN);
    }

    // Health/status check
    fastify.get("/", async (req, res) => {
      return res.status(200).send({ enabled: GitHubIsEnabled() });
    });

    // List all accessible repos (for the Add Repo dialog)
    fastify.get("/repos", async (req, res) => {
      if (!(await AuthGetUserSession(req)).isAuthenticated) {
        return res.status(403).send({ error: "Access Denied" });
      }
      if (!GitHubIsEnabled()) {
        return res.status(501).send({ error: "GitHub Not Enabled" });
      }
      try {
        const organizations = await GitHubListRepos();
        return res.status(200).send({ organizations });
      } catch (err) {
        logger.error("Failed to list repos", err);
        return res.status(502).send({ error: "GitHub API Error" });
      }
    });

    // List PRs for a repo
    fastify.get<{ Params: { owner: string; repo: string } }>(
      "/repos/:owner/:repo/pulls",
      async (req, res) => {
        if (!(await AuthGetUserSession(req)).isAuthenticated) {
          return res.status(403).send({ error: "Access Denied" });
        }
        if (!GitHubIsEnabled()) {
          return res.status(501).send({ error: "GitHub Not Enabled" });
        }
        try {
          const pulls = await GitHubListPulls(
            req.params.owner,
            req.params.repo,
          );
          return res.status(200).send({ pulls });
        } catch (err) {
          logger.error("Failed to list pulls", err);
          return res.status(502).send({ error: "GitHub API Error" });
        }
      },
    );

    // Get latest actions for a repo
    fastify.get<{ Params: { owner: string; repo: string } }>(
      "/repos/:owner/:repo/actions",
      async (req, res) => {
        if (!(await AuthGetUserSession(req)).isAuthenticated) {
          return res.status(403).send({ error: "Access Denied" });
        }
        if (!GitHubIsEnabled()) {
          return res.status(501).send({ error: "GitHub Not Enabled" });
        }
        try {
          const runs = await GitHubGetLatestActions(
            req.params.owner,
            req.params.repo,
          );
          return res.status(200).send({ runs });
        } catch (err) {
          logger.error("Failed to get actions", err);
          return res.status(502).send({ error: "GitHub API Error" });
        }
      },
    );

    // Create a pull request
    fastify.post<{
      Params: { owner: string; repo: string };
      Body: { title: string; head: string; base: string };
    }>("/repos/:owner/:repo/pulls", async (req, res) => {
      if (!(await AuthGetUserSession(req)).isAuthenticated) {
        return res.status(403).send({ error: "Access Denied" });
      }
      if (!GitHubIsEnabled()) {
        return res.status(501).send({ error: "GitHub Not Enabled" });
      }
      if (!req.body.title || !req.body.head || !req.body.base) {
        return res.status(400).send({ error: "Missing: title, head, base" });
      }
      try {
        await GitHubCreatePull(
          req.params.owner,
          req.params.repo,
          req.body.title,
          req.body.head,
          req.body.base,
        );
        return res.status(201).send({});
      } catch (err) {
        logger.error("Failed to create pull request", err);
        return res.status(502).send({ error: "GitHub API Error" });
      }
    });

    // Merge a pull request
    fastify.post<{
      Params: { owner: string; repo: string; number: number };
    }>("/repos/:owner/:repo/pulls/:number/merge", async (req, res) => {
      if (!(await AuthGetUserSession(req)).isAuthenticated) {
        return res.status(403).send({ error: "Access Denied" });
      }
      if (!GitHubIsEnabled()) {
        return res.status(501).send({ error: "GitHub Not Enabled" });
      }
      try {
        await GitHubMergePull(
          req.params.owner,
          req.params.repo,
          req.params.number,
        );
        return res.status(200).send({});
      } catch (err) {
        logger.error("Failed to merge pull request", err);
        return res.status(502).send({ error: "GitHub API Error" });
      }
    });

    // Clone a GitHub repo as a project (SSH clone)
    fastify.post<{ Params: { owner: string; repo: string } }>(
      "/repos/:owner/:repo/clone",
      async (req, res) => {
        if (!(await AuthGetUserSession(req)).isAuthenticated) {
          return res.status(403).send({ error: "Access Denied" });
        }
        if (!GitHubIsEnabled()) {
          return res.status(501).send({ error: "GitHub Not Enabled" });
        }
        const span = OTelTracer().startSpan("GitHubClone");
        try {
          const project = new Project();
          project.name = `${req.params.owner}/${req.params.repo}`;
          project.info = {
            url: `git@github.com:${req.params.owner}/${req.params.repo}.git`,
          };

          await ProjectsDataAdd(span, project);
          EventBusEmit({
            repository: project.projectId,
            eventType: RepositoryEventTypes.GITHUB_CLONE_STARTED,
            eventDetail: { project },
          });

          await GitClone(span, project);
          await ProjectsSyncStartProject(span, project);

          EventBusEmit({
            repository: project.projectId,
            eventType: RepositoryEventTypes.GITHUB_CLONE_COMPLETED,
            eventDetail: { project },
          });

          span.end();
          return res.status(201).send({ projectId: project.projectId });
        } catch (err) {
          logger.error("Failed to clone GitHub repo", err);
          EventBusEmit({
            repository: "",
            eventType: RepositoryEventTypes.GITHUB_CLONE_FAILED,
            eventDetail: {
              owner: req.params.owner,
              repo: req.params.repo,
            },
          });
          span.end();
          return res.status(500).send({ error: "Clone Failed" });
        }
      },
    );
  }
}
