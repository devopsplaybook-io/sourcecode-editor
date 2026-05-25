import { OTelRequestSpan } from "@devopsplaybook.io/otel-utils-fastify";
import { FastifyInstance } from "fastify";
import { ProjectsDataGet } from "./ProjectsData";
import { AuthGetUserSession } from "../users/Auth";
import {
  FilesProjectGet,
  FilesProjectList,
  FilesProjectUpdate,
  FilesProjectRename,
  FilesProjectDelete,
  FilesProjectCreate,
} from "../files/Files";
import {
  ApiUtilsCompressJson,
  ApiUtilsDecompress,
} from "../utils-std-ts/ApiUtils";
import { ProjectsSyncStartProject } from "./ProjectsSync";
import { EventBusEmit } from "../events/EventBus";
import { RepositoryEventTypes } from "../events/RepositoryEventTypes";
import { GitGetFileFromHead } from "../git/Git";

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
        req.params.projectId,
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
          req.params.projectId,
        );
        if (!project) {
          return res.status(404).send({ error: "Project Not Found" });
        }
        const content = await FilesProjectGet(
          OTelRequestSpan(req),
          project,
          req.body.file,
        );
        res.status(200).send({
          file: await ApiUtilsCompressJson({ content }),
        });
      },
    );

    fastify.post<{
      Params: { projectId: string };
      Body: { file: string; content: string };
    }>("/content/update", async (req, res) => {
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
      FilesProjectUpdate(
        OTelRequestSpan(req),
        project,
        req.body.file,
        await ApiUtilsDecompress(req.body.content),
      )
        .then(() => {
          EventBusEmit({
            repository: project.projectId,
            eventType: RepositoryEventTypes.FILE_UPDATED,
            eventDetail: { path: req.body.file },
          });
          return ProjectsSyncStartProject(OTelRequestSpan(req), project, [
            "filesUpdateStatus",
          ]);
        })
        .then(() => {
          res.status(200).send({ success: true });
        })
        .catch(() => {
          res.status(500).send({ error: "File Update Failed" });
        });
    });

    fastify.post<{
      Params: { projectId: string };
      Body: { parentPath: string; fileName: string };
    }>("/create", async (req, res) => {
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
      try {
        await FilesProjectCreate(
          OTelRequestSpan(req),
          project,
          req.body.parentPath,
          req.body.fileName,
        );
        EventBusEmit({
          repository: project.projectId,
          eventType: RepositoryEventTypes.FILE_CREATED,
          eventDetail: {
            parentPath: req.body.parentPath,
            fileName: req.body.fileName,
          },
        });
        await ProjectsSyncStartProject(OTelRequestSpan(req), project, [
          "filesUpdateStatus",
        ]);
        res.status(200).send({ success: true });
      } catch {
        res.status(500).send({ error: "File Create Failed" });
      }
    });

    fastify.post<{
      Params: { projectId: string };
      Body: { filePath: string };
    }>("/delete", async (req, res) => {
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
      try {
        await FilesProjectDelete(
          OTelRequestSpan(req),
          project,
          req.body.filePath,
        );
        EventBusEmit({
          repository: project.projectId,
          eventType: RepositoryEventTypes.FILE_DELETED,
          eventDetail: { path: req.body.filePath },
        });
        await ProjectsSyncStartProject(OTelRequestSpan(req), project, [
          "filesUpdateStatus",
        ]);
        res.status(200).send({ success: true });
      } catch {
        res.status(500).send({ error: "File Delete Failed" });
      }
    });

    fastify.post<{
      Params: { projectId: string };
      Body: { file: string };
    }>("/diff", async (req, res) => {
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
      let originalContent: string;
      let currentContent: string;
      try {
        originalContent = await GitGetFileFromHead(
          OTelRequestSpan(req),
          project,
          req.body.file,
        );
      } catch {
        originalContent = "";
      }
      try {
        currentContent = await FilesProjectGet(
          OTelRequestSpan(req),
          project,
          req.body.file,
        );
      } catch {
        currentContent = "";
      }
      res.status(200).send({
        diff: await ApiUtilsCompressJson({
          originalContent,
          currentContent,
        }),
      });
    });

    fastify.post<{
      Params: { projectId: string };
      Body: { oldPath: string; newPath: string };
    }>("/rename", async (req, res) => {
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
      try {
        await FilesProjectRename(
          OTelRequestSpan(req),
          project,
          req.body.oldPath,
          req.body.newPath,
        );
        EventBusEmit({
          repository: project.projectId,
          eventType: RepositoryEventTypes.FILE_RENAMED,
          eventDetail: {
            oldPath: req.body.oldPath,
            newPath: req.body.newPath,
          },
        });
        await ProjectsSyncStartProject(OTelRequestSpan(req), project, [
          "filesUpdateStatus",
        ]);
        res.status(200).send({ success: true });
      } catch {
        res.status(500).send({ error: "File Rename Failed" });
      }
    });
  }
}
