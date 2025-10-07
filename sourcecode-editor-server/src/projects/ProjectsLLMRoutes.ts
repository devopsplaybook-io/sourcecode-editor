import { OTelRequestSpan } from "@devopsplaybook.io/otel-utils-fastify";
import { FastifyInstance } from "fastify";
import { ProjectsDataGet } from "./ProjectsData";
import { AuthGetUserSession } from "../users/Auth";
import { FilesProjectGet } from "../files/Files";
import { ApiUtilsCompressJson } from "../utils-std-ts/ApiUtils";
import { LLMRequest } from "../ai/LLM";

export class ProjectsLLMRoutes {
  //
  public async getRoutes(fastify: FastifyInstance): Promise<void> {
    //
    fastify.post<{
      Params: { projectId: string };
      Body: { prompt: string; file: string };
    }>("/file", async (req, res) => {
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
      const fileContent = await FilesProjectGet(
        OTelRequestSpan(req),
        project,
        req.body.file
      );
      const code = await LLMRequest(
        OTelRequestSpan(req),
        [
          {
            role: "system",
            content:
              "You are a coding assistant. " +
              "You will be provided with the content of a code file and a request to modify it. " +
              "You must provide the full updated file content, ensuring that the code is correct and complete. " +
              "Do not include any explanations or additional text, only the updated file content. \n" +
              "OUTPUT FORMAT (JSON only):\n" +
              "{\n" +
              '  "code_output": the modified code,\n' +
              '  "explanation": a very short explanation of the change made\n' +
              "}\n",
          },
          {
            role: "user",
            content:
              `Here is the content of the file ${req.body.file}:\n\n` +
              `${fileContent}\n\n` +
              `Based on this content, please make the following changes to the file: ${req.body.prompt}\n\n`,
          },
        ],
        false
      );
      res.status(201).send({ response: await ApiUtilsCompressJson({ code }) });
    });
  }
}
