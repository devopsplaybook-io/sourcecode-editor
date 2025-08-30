import { OTelRequestSpan } from "@devopsplaybook.io/otel-utils-fastify";
import { FastifyInstance, RequestGenericInterface } from "fastify";
import { Project } from "../model/Project";
import {
  ProjectsDataAdd,
  ProjectsDataGet,
  ProjectsDataList,
  ProjectsDataUpdate,
} from "./ProjectsData";
import { GitCheckout, GitClone } from "../git/Git";
import { OTelLogger } from "../OTelContext";
import { AuthGetUserSession } from "../users/Auth";

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
        .then(() => {
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
        .then(() => {
          res.status(201).send({});
        })
        .catch((err) => {
          logger.error("Git Checkout Failed: " + err.message);
          return res.status(500).send({ error: "Operation Failed" });
        });
    });
  }
}
