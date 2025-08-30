import { OTelRequestSpan } from "@devopsplaybook.io/otel-utils-fastify";
import { FastifyInstance } from "fastify";
import { ProjectsDataGet } from "./ProjectsData";
import { AuthGetUserSession } from "../users/Auth";
import { FilesProjectList } from "../files/Files";

export class ProjectsFilesRoutes {
  //
  public async getRoutes(fastify: FastifyInstance): Promise<void> {
    //
    fastify.get<{ Params: { projectId: string } }>("/", async (req, res) => {
      if (!(await AuthGetUserSession(req)).isAuthenticated) {
        return res.status(403).send({ error: "Access Denied" });
      }
      const project = await ProjectsDataGet(
        OTelRequestSpan(req),
        req.params.projectId
      );
      if (!project) {
        return res.status(404).send({ error: "Project Not Found" });
      }
      const files = await FilesProjectList(OTelRequestSpan(req), project);
      res.status(200).send({
        files,
      });
    });
  }
}
