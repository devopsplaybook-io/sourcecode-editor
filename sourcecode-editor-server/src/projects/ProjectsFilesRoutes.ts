import { OTelRequestSpan } from "@devopsplaybook.io/otel-utils-fastify";
import { FastifyInstance } from "fastify";
import { ProjectsDataGet } from "./ProjectsData";
import { AuthGetUserSession } from "../users/Auth";
import {
  FilesProjectGet,
  FilesProjectList,
  FilesProjectUpdate,
} from "../files/Files";
import {
  ApiUtilsCompressJson,
  ApiUtilsDecompress,
} from "../utils-std-ts/ApiUtils";

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

    fastify.post<{ Params: { projectId: string }; Body: { file: string } }>(
      "/content/retrieval",
      async (req, res) => {
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
        const content = await FilesProjectGet(
          OTelRequestSpan(req),
          project,
          req.body.file
        );
        res.status(200).send({
          file: await ApiUtilsCompressJson({ content }),
        });
      }
    );

    // Add new route for updating file content
    fastify.post<{
      Params: { projectId: string };
      Body: { file: string; content: string };
    }>("/content/update", async (req, res) => {
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
      FilesProjectUpdate(
        OTelRequestSpan(req),
        project,
        req.body.file,
        await ApiUtilsDecompress(req.body.content)
      )
        .then(() => {
          res.status(200).send({ success: true });
        })
        .catch(() => {
          res.status(500).send({ error: "File Update Failed" });
        });
    });
  }
}
