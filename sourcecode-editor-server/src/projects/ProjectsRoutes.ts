import { OTelRequestSpan } from "@devopsplaybook.io/otel-utils-fastify";
import { FastifyInstance } from "fastify";
import { Project } from "../model/Project";
import {
  ProjectsDataAdd,
  ProjectsDataGet,
  ProjectsDataList,
  ProjectsDataRemove,
  ProjectsDataUpdate,
} from "./ProjectsData";
import { AuthGetUserSession } from "../users/Auth";
import {
  ProjectsSyncGetStatusProject,
  ProjectsSyncRemoveProject,
  ProjectsSyncStart,
  ProjectsSyncStartProject,
} from "./ProjectsSync";
import { OTelLogger } from "../OTelContext";
import { GitClone, GitGetErrorOutput, GitRemoveProject } from "../git/Git";
import { RepoUrlIsValid } from "../git/RepoUrl";
import { EventBusEmit } from "../events/EventBus";
import { RepositoryEventTypes } from "../events/RepositoryEventTypes";
import { RunWithEvents } from "./ProjectOperationEvents";
const logger = OTelLogger().createModuleLogger("ProjectsRoutes");
export class ProjectsRoutes {
  //
  public async getRoutes(fastify: FastifyInstance): Promise<void> {
    //
    fastify.get("/", async (req, res) => {
      if (!(await AuthGetUserSession(req)).isAuthenticated) {
        return res.status(403).send({ error: "Access Denied" });
      }
      res
        .status(200)
        .send({ projects: await ProjectsDataList(OTelRequestSpan(req)) });
    });

    fastify.post<{
      Body: {
        name: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        info: any;
        clone?: boolean;
      };
    }>("/", async (req, res) => {
      if (!(await AuthGetUserSession(req)).isAuthenticated) {
        return res.status(403).send({ error: "Access Denied" });
      }
      if (!req.body.name) {
        return res.status(400).send({ error: "Missing: Name" });
      }
      if (!req.body.info || !RepoUrlIsValid(req.body.info.url)) {
        return res.status(400).send({
          error: "Invalid Repository URL",
          detail: req.body.info ? String(req.body.info.url) : "",
        });
      }
      const project = new Project();
      project.name = req.body.name;
      project.info = req.body.info || "";
      await ProjectsDataAdd(OTelRequestSpan(req), project);
      EventBusEmit({
        repository: project.projectId,
        eventType: RepositoryEventTypes.PROJECT_CREATED,
        eventDetail: { project },
      });
      if (req.body.clone === false) {
        res.status(201).send({});
        return;
      }
      try {
        await RunWithEvents(
          OTelRequestSpan(req),
          project,
          "git.clone",
          async () => {
            await GitClone(OTelRequestSpan(req), project);
          },
        );
      } catch (err) {
        logger.error("Failed to clone project", err, OTelRequestSpan(req));
        return res.status(500).send({
          error: "Operation Failed",
          detail: GitGetErrorOutput(err),
        });
      }
      res.status(201).send({});
    });

    fastify.post("/sync", async (req, res) => {
      if (!(await AuthGetUserSession(req)).isAuthenticated) {
        return res.status(403).send({ error: "Access Denied" });
      }
      await ProjectsSyncStart(OTelRequestSpan(req));
      res.status(201).send({});
    });

    fastify.put<{
      Params: { projectId: string };
      Body: {
        name: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        info: any;
      };
    }>("/:projectId", async (req, res) => {
      if (!(await AuthGetUserSession(req)).isAuthenticated) {
        return res.status(403).send({ error: "Access Denied" });
      }
      const project = await ProjectsDataGet(
        OTelRequestSpan(req),
        req.params.projectId,
      );
      if (!project) {
        return res.status(404).send({ error: "Project Not Found" });
      }
      if (
        req.body.info &&
        typeof req.body.info.url === "string" &&
        req.body.info.url.length > 0 &&
        !RepoUrlIsValid(req.body.info.url)
      ) {
        return res.status(400).send({
          error: "Invalid Repository URL",
          detail: req.body.info.url,
        });
      }
      project.name = req.body.name || project.name;
      project.info = req.body.info || project.info;
      await ProjectsDataUpdate(OTelRequestSpan(req), project);
      EventBusEmit({
        repository: project.projectId,
        eventType: RepositoryEventTypes.PROJECT_UPDATED,
        eventDetail: { project },
      });
      ProjectsSyncStartProject(OTelRequestSpan(req), project).catch((err) => {
        logger.error(
          `Error Triggering Project Sync`,
          err,
          OTelRequestSpan(req),
        );
      });
      res.status(200).send({});
    });

    fastify.delete<{ Params: { projectId: string } }>(
      "/:projectId",
      async (req, res) => {
        if (!(await AuthGetUserSession(req)).isAuthenticated) {
          return res.status(403).send({ error: "Access Denied" });
        }
        const project = await ProjectsDataGet(
          OTelRequestSpan(req),
          req.params.projectId,
        );
        if (!project) {
          return res.status(404).send({ error: "Project Not Found" });
        }
        // Removes the project from the application only: the DB entry and
        // the local clone. The remote repository is never deleted.
        await ProjectsDataRemove(OTelRequestSpan(req), project.projectId);
        await ProjectsSyncRemoveProject(
          OTelRequestSpan(req),
          project.projectId,
        );
        await GitRemoveProject(OTelRequestSpan(req), project);
        EventBusEmit({
          repository: project.projectId,
          eventType: RepositoryEventTypes.PROJECT_DELETED,
          eventDetail: { project },
        });
        res.status(200).send({});
      },
    );

    fastify.get<{ Params: { projectId: string } }>(
      "/:projectId/status",
      async (req, res) => {
        if (!(await AuthGetUserSession(req)).isAuthenticated) {
          return res.status(403).send({ error: "Access Denied" });
        }
        const status = await ProjectsSyncGetStatusProject(
          OTelRequestSpan(req),
          req.params.projectId,
        );
        if (!status) {
          return res.status(200).send({ status: null });
        }
        res.status(200).send({
          status,
        });
      },
    );

    fastify.get<{ Params: { projectId: string } }>(
      "/:projectId",
      async (req, res) => {
        if (!(await AuthGetUserSession(req)).isAuthenticated) {
          return res.status(403).send({ error: "Access Denied" });
        }
        const project = await ProjectsDataGet(
          OTelRequestSpan(req),
          req.params.projectId,
        );
        if (!project) {
          return res.status(404).send({ error: "Project Not Found" });
        }
        res.status(200).send(project);
      },
    );
  }
}
