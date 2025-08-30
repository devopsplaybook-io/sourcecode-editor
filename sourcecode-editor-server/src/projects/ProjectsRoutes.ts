import { OTelRequestSpan } from "@devopsplaybook.io/otel-utils-fastify";
import { FastifyInstance } from "fastify";
import { Project } from "../model/Project";
import {
  ProjectsDataAdd,
  ProjectsDataGet,
  ProjectsDataList,
  ProjectsDataUpdate,
} from "./ProjectsData";
import { AuthGetUserSession } from "../users/Auth";
import { ProjectsSyncGetStatusProject } from "./ProjectsSync";

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
      };
    }>("/", async (req, res) => {
      if (!(await AuthGetUserSession(req)).isAuthenticated) {
        return res.status(403).send({ error: "Access Denied" });
      }
      if (!req.body.name) {
        return res.status(400).send({ error: "Missing: Name" });
      }
      const newProject = new Project();
      newProject.name = req.body.name;
      newProject.info = req.body.info || "";
      await ProjectsDataAdd(OTelRequestSpan(req), newProject);
      res.status(201).send({});
    });

    fastify.put<{
      Body: {
        id: string;
        name: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        info: any;
      };
    }>("/", async (req, res) => {
      if (!(await AuthGetUserSession(req)).isAuthenticated) {
        return res.status(403).send({ error: "Access Denied" });
      }
      if (!req.body.id) {
        return res.status(400).send({ error: "Missing: Project ID" });
      }
      const project = await ProjectsDataGet(OTelRequestSpan(req), req.body.id);
      if (!project) {
        return res.status(404).send({ error: "Project Not Found" });
      }
      project.name = req.body.name || project.name;
      project.info = req.body.info || project.info;
      await ProjectsDataUpdate(OTelRequestSpan(req), project);
      res.status(200).send({});
    });

    fastify.get<{ Params: { projectId: string } }>(
      "/:projectId/status",
      async (req, res) => {
        if (!(await AuthGetUserSession(req)).isAuthenticated) {
          return res.status(403).send({ error: "Access Denied" });
        }
        const status = await ProjectsSyncGetStatusProject(
          OTelRequestSpan(req),
          req.params.projectId
        );
        if (!status) {
          return res.status(401).send({ error: "Invalid Request" });
        }
        res.status(200).send({
          status,
        });
      }
    );
  }
}
