import { OTelRequestSpan } from "@devopsplaybook.io/otel-utils-fastify";
import { FastifyInstance, RequestGenericInterface } from "fastify";
import { Project } from "../model/Project";
import {
  ProjectsDataAdd,
  ProjectsDataGet,
  ProjectsDataList,
  ProjectsDataUpdate,
} from "./ProjectsData";

export class ProjectsRoutes {
  //
  public async getRoutes(fastify: FastifyInstance): Promise<void> {
    //
    fastify.get("/", async (req, res) => {
      res
        .status(200)
        .send({ projects: await ProjectsDataList(OTelRequestSpan(req)) });
    });

    interface PostProject extends RequestGenericInterface {
      Body: {
        name: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        info: any;
      };
    }
    fastify.post<PostProject>("/", async (req, res) => {
      if (!req.body.name) {
        return res.status(400).send({ error: "Missing: Name" });
      }
      const newProject = new Project();
      newProject.name = req.body.name;
      newProject.info = req.body.info || "";
      await ProjectsDataAdd(OTelRequestSpan(req), newProject);
      res.status(201).send({});
    });

    interface PutProject extends RequestGenericInterface {
      Body: {
        id: string;
        name: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        info: any;
      };
    }
    fastify.put<PutProject>("/", async (req, res) => {
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
  }
}
