import { OTelRequestSpan } from "@devopsplaybook.io/otel-utils-fastify";
import { FastifyInstance, RequestGenericInterface } from "fastify";
import { Project } from "../model/Project";
import {
  ProjectsDataAdd,
  ProjectsDataGet,
  ProjectsDataList,
  ProjectsDataUpdate,
} from "./ProjectsData";
import {
  GitCheckout,
  GitClone,
  GitCommit,
  GitPull,
  GitPush,
  GitReset,
  GitCreateBranch,
  GitDeleteBranch,
} from "../git/Git";
import { OTelLogger } from "../OTelContext";
import { AuthGetUserSession } from "../users/Auth";
import { ProjectsSyncStartProject } from "./ProjectsSync";

const logger = OTelLogger().createModuleLogger("ProjectsOperationsRoutes");

export class ProjectsOperationsRoutes {
  //
  public async getRoutes(fastify: FastifyInstance): Promise<void> {
    //
    fastify.post<{
      Params: {
        projectId: string;
      };
    }>("/clone", async (req, res) => {
      if (!(await AuthGetUserSession(req)).isAuthenticated) {
        return res.status(403).send({ error: "Access Denied" });
      }
      const project = await ProjectsDataGet(
        OTelRequestSpan(req),
        req.params.projectId
      );
      if (!project) {
        return res.status(401).send({ error: "Operation Rejected" });
      }
      GitClone(OTelRequestSpan(req), project)
        .then(async () => {
          await ProjectsSyncStartProject(OTelRequestSpan(req), project);
          res.status(201).send({});
        })
        .catch((err) => {
          logger.error("Git Clone Failed: " + err.message);
          return res.status(500).send({ error: "Operation Failed" });
        });
    });

    fastify.post<{
      Params: {
        projectId: string;
      };
      Body: {
        branch: string;
      };
    }>("/checkout", async (req, res) => {
      if (!(await AuthGetUserSession(req)).isAuthenticated) {
        return res.status(403).send({ error: "Access Denied" });
      }
      const project = await ProjectsDataGet(
        OTelRequestSpan(req),
        req.params.projectId
      );
      if (!project) {
        return res.status(401).send({ error: "Operation Rejected" });
      }
      GitCheckout(OTelRequestSpan(req), project, req.body.branch)
        .then(async () => {
          await ProjectsSyncStartProject(OTelRequestSpan(req), project);
          res.status(201).send({});
        })
        .catch((err) => {
          logger.error("Git Checkout Failed: " + err.message);
          return res.status(500).send({ error: "Operation Failed" });
        });
    });

    fastify.post<{
      Params: {
        projectId: string;
      };
    }>("/pull", async (req, res) => {
      if (!(await AuthGetUserSession(req)).isAuthenticated) {
        return res.status(403).send({ error: "Access Denied" });
      }
      const project = await ProjectsDataGet(
        OTelRequestSpan(req),
        req.params.projectId
      );
      if (!project) {
        return res.status(401).send({ error: "Operation Rejected" });
      }
      GitPull(OTelRequestSpan(req), project)
        .then(async () => {
          await ProjectsSyncStartProject(OTelRequestSpan(req), project);
          res.status(201).send({});
        })
        .catch((err) => {
          logger.error("Git Pull Failed: " + err.message);
          return res.status(500).send({ error: "Operation Failed" });
        });
    });

    fastify.post<{
      Params: {
        projectId: string;
      };
    }>("/reset", async (req, res) => {
      if (!(await AuthGetUserSession(req)).isAuthenticated) {
        return res.status(403).send({ error: "Access Denied" });
      }
      const project = await ProjectsDataGet(
        OTelRequestSpan(req),
        req.params.projectId
      );
      if (!project) {
        return res.status(401).send({ error: "Operation Rejected" });
      }
      GitReset(OTelRequestSpan(req), project)
        .then(async () => {
          await ProjectsSyncStartProject(OTelRequestSpan(req), project);
          res.status(201).send({});
        })
        .catch((err) => {
          logger.error("Git Reset Failed: " + err.message);
          return res.status(500).send({ error: "Operation Failed" });
        });
    });

    fastify.post<{
      Params: {
        projectId: string;
      };
      Body: { message: string; files: string[] };
    }>("/commit", async (req, res) => {
      if (!(await AuthGetUserSession(req)).isAuthenticated) {
        return res.status(403).send({ error: "Access Denied" });
      }
      const project = await ProjectsDataGet(
        OTelRequestSpan(req),
        req.params.projectId
      );
      if (!project) {
        return res.status(401).send({ error: "Operation Rejected" });
      }
      GitCommit(OTelRequestSpan(req), project, req.body.files, req.body.message)
        .then(async () => {
          await ProjectsSyncStartProject(OTelRequestSpan(req), project);
          res.status(201).send({});
        })
        .catch((err) => {
          logger.error("Git Pull Failed: " + err.message);
          return res.status(500).send({ error: "Operation Failed" });
        });
    });

    fastify.post<{
      Params: {
        projectId: string;
      };
    }>("/push", async (req, res) => {
      if (!(await AuthGetUserSession(req)).isAuthenticated) {
        return res.status(403).send({ error: "Access Denied" });
      }
      const project = await ProjectsDataGet(
        OTelRequestSpan(req),
        req.params.projectId
      );
      if (!project) {
        return res.status(401).send({ error: "Operation Rejected" });
      }
      GitPush(OTelRequestSpan(req), project)
        .then(async () => {
          await ProjectsSyncStartProject(OTelRequestSpan(req), project);
          res.status(201).send({});
        })
        .catch((err) => {
          logger.error("Git Pull Failed: " + err.message);
          return res.status(500).send({ error: "Operation Failed" });
        });
    });

    fastify.post<{
      Params: { projectId: string };
      Body: { branch: string };
    }>("/branch/create", async (req, res) => {
      if (!(await AuthGetUserSession(req)).isAuthenticated) {
        return res.status(403).send({ error: "Access Denied" });
      }
      const project = await ProjectsDataGet(
        OTelRequestSpan(req),
        req.params.projectId
      );
      if (!project) {
        return res.status(401).send({ error: "Operation Rejected" });
      }
      GitCreateBranch(OTelRequestSpan(req), project, req.body.branch)
        .then(async () => {
          await ProjectsSyncStartProject(OTelRequestSpan(req), project);
          res.status(201).send({});
        })
        .catch((err) => {
          logger.error("Git Create Branch Failed: " + err.message);
          return res.status(500).send({ error: "Operation Failed" });
        });
    });

    fastify.post<{
      Params: { projectId: string };
      Body: { branch: string; remote?: boolean };
    }>("/branch/delete", async (req, res) => {
      if (!(await AuthGetUserSession(req)).isAuthenticated) {
        return res.status(403).send({ error: "Access Denied" });
      }
      const project = await ProjectsDataGet(
        OTelRequestSpan(req),
        req.params.projectId
      );
      if (!project) {
        return res.status(401).send({ error: "Operation Rejected" });
      }
      GitDeleteBranch(OTelRequestSpan(req), project, req.body.branch)
        .then(async () => {
          await ProjectsSyncStartProject(OTelRequestSpan(req), project);
          res.status(201).send({});
        })
        .catch((err) => {
          logger.error("Git Delete Branch Failed: " + err.message);
          return res.status(500).send({ error: "Operation Failed" });
        });
    });
  }
}
