import { OTelRequestSpan } from "@devopsplaybook.io/otel-utils-fastify";
import { FastifyInstance } from "fastify";
import { ProjectsDataGet } from "./ProjectsData";
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
import { RunWithEvents } from "./ProjectOperationEvents";

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
        req.params.projectId,
      );
      if (!project) {
        return res.status(401).send({ error: "Operation Rejected" });
      }
      RunWithEvents(OTelRequestSpan(req), project, "git.clone", async () => {
        await GitClone(OTelRequestSpan(req), project);
      })
        .then(() => res.status(201).send({}))
        .catch((err) => {
          logger.error("Git Clone Failed", err, OTelRequestSpan(req));
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
        req.params.projectId,
      );
      if (!project) {
        return res.status(401).send({ error: "Operation Rejected" });
      }
      RunWithEvents(
        OTelRequestSpan(req),
        project,
        "git.checkout",
        async () => {
          await GitCheckout(OTelRequestSpan(req), project, req.body.branch);
        },
        { completedDetail: { branch: req.body.branch } },
      )
        .then(() => res.status(201).send({}))
        .catch((err) => {
          logger.error("Git Checkout Failed", err, OTelRequestSpan(req));
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
        req.params.projectId,
      );
      if (!project) {
        return res.status(401).send({ error: "Operation Rejected" });
      }
      RunWithEvents(OTelRequestSpan(req), project, "git.pull", async () => {
        await GitPull(OTelRequestSpan(req), project);
      })
        .then(() => res.status(201).send({}))
        .catch((err) => {
          logger.error("Git Pull Failed", err, OTelRequestSpan(req));
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
        req.params.projectId,
      );
      if (!project) {
        return res.status(401).send({ error: "Operation Rejected" });
      }
      RunWithEvents(OTelRequestSpan(req), project, "git.reset", async () => {
        await GitReset(OTelRequestSpan(req), project);
      })
        .then(() => res.status(201).send({}))
        .catch((err) => {
          logger.error("Git Reset Failed", err, OTelRequestSpan(req));
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
        req.params.projectId,
      );
      if (!project) {
        return res.status(401).send({ error: "Operation Rejected" });
      }
      RunWithEvents(
        OTelRequestSpan(req),
        project,
        "git.commit",
        async () => {
          await GitCommit(
            OTelRequestSpan(req),
            project,
            req.body.files,
            req.body.message,
          );
        },
        {
          completedDetail: {
            message: req.body.message,
            files: req.body.files,
          },
        },
      )
        .then(() => res.status(201).send({}))
        .catch((err) => {
          logger.error("Git Commit Failed", err, OTelRequestSpan(req));
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
        req.params.projectId,
      );
      if (!project) {
        return res.status(401).send({ error: "Operation Rejected" });
      }
      RunWithEvents(OTelRequestSpan(req), project, "git.push", async () => {
        await GitPush(OTelRequestSpan(req), project);
      })
        .then(() => res.status(201).send({}))
        .catch((err) => {
          logger.error("Git Push Failed", err, OTelRequestSpan(req));
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
        req.params.projectId,
      );
      if (!project) {
        return res.status(401).send({ error: "Operation Rejected" });
      }
      RunWithEvents(
        OTelRequestSpan(req),
        project,
        "git.branch.create",
        async () => {
          await GitCreateBranch(OTelRequestSpan(req), project, req.body.branch);
        },
        { completedDetail: { branch: req.body.branch } },
      )
        .then(() => res.status(201).send({}))
        .catch((err) => {
          logger.error("Git Create Branch Failed", err, OTelRequestSpan(req));
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
        req.params.projectId,
      );
      if (!project) {
        return res.status(401).send({ error: "Operation Rejected" });
      }
      RunWithEvents(
        OTelRequestSpan(req),
        project,
        "git.branch.delete",
        async () => {
          await GitDeleteBranch(OTelRequestSpan(req), project, req.body.branch);
        },
        { completedDetail: { branch: req.body.branch } },
      )
        .then(() => res.status(201).send({}))
        .catch((err) => {
          logger.error("Git Delete Branch Failed", err, OTelRequestSpan(req));
          return res.status(500).send({ error: "Operation Failed" });
        });
    });
  }
}
