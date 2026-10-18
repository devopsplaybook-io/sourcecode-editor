import { OTelRequestSpan } from "@devopsplaybook.io/otel-utils-fastify";
import { FastifyInstance } from "fastify";
import { ProjectsDataGet } from "./ProjectsData";
import { AuthGetUserSession } from "../users/Auth";
import {
  LLMBuildMessages,
  LLMContext,
  LLMMessage,
  LLMPresetExists,
  LLMPresetId,
} from "../ai/LLMPrompts";
import { LLMStreamRequest, LLMSSEFrame } from "../ai/LLM";
import { Config } from "../Config";
import { OTelLogger } from "../OTelContext";

const logger = OTelLogger().createModuleLogger("ProjectsLLMRoutes");

const LLM_MAX_CONTEXT_CHARS = 400_000;
const LLM_HISTORY_MAX_MESSAGES = 10;

interface LLMChatBody {
  action: string;
  prompt?: string;
  file: string;
  content: string;
  selection?: {
    content: string;
    startLine: number;
    endLine: number;
  } | null;
  history?: LLMMessage[];
}

function LLMChatValidateBody(body: LLMChatBody): string | null {
  if (!body || typeof body !== "object") {
    return "Invalid request body";
  }
  if (!LLMPresetExists(body.action)) {
    return "Unknown LLM action";
  }
  if (typeof body.file !== "string" || !body.file) {
    return "Missing file";
  }
  if (typeof body.content !== "string" || !body.content) {
    return "Missing file content";
  }
  if (
    body.action === "custom" &&
    (typeof body.prompt !== "string" || !body.prompt.trim())
  ) {
    return "Missing prompt";
  }
  const totalChars =
    body.content.length + (body.selection?.content?.length || 0);
  if (totalChars > LLM_MAX_CONTEXT_CHARS) {
    return "Context too large (max 400 KB)";
  }
  if (body.selection) {
    const selection = body.selection;
    if (
      typeof selection !== "object" ||
      typeof selection.content !== "string" ||
      typeof selection.startLine !== "number" ||
      typeof selection.endLine !== "number"
    ) {
      return "Invalid selection";
    }
  }
  if (body.history !== undefined && body.history !== null) {
    if (!Array.isArray(body.history)) {
      return "Invalid history";
    }
    for (const entry of body.history) {
      if (
        !entry ||
        typeof entry !== "object" ||
        (entry.role !== "user" && entry.role !== "assistant") ||
        typeof entry.content !== "string"
      ) {
        return "Invalid history";
      }
    }
  }
  return null;
}

export class ProjectsLLMRoutes {
  //
  public async getRoutes(
    fastify: FastifyInstance,
    config: Config
  ): Promise<void> {
    //
    fastify.post<{
      Params: { projectId: string };
      Body: LLMChatBody;
    }>("/chat", async (req, res) => {
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
      const validationError = LLMChatValidateBody(req.body);
      if (validationError) {
        return res.status(400).send({ error: validationError });
      }

      const context: LLMContext = {
        action: req.body.action as LLMPresetId,
        file: req.body.file,
        content: req.body.content,
        selection: req.body.selection || null,
        prompt: typeof req.body.prompt === "string" ? req.body.prompt : "",
      };
      const history = Array.isArray(req.body.history)
        ? req.body.history.slice(-LLM_HISTORY_MAX_MESSAGES)
        : [];
      const messages = LLMBuildMessages(context, history);

      logger.info(
        `LLM chat stream requested for ${req.body.file}`,
        OTelRequestSpan(req)
      );

      // Abort the upstream call as soon as the client goes away.
      const abortController = new AbortController();
      res.hijack();
      const raw = res.raw;
      raw.on("close", () => abortController.abort());
      raw.on("error", () => {
        // Writing to a disconnected client must not crash the process.
      });
      raw.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      const send = (event: string, data: unknown): void => {
        raw.write(LLMSSEFrame(event, data));
      };
      send("meta", { model: config.LLM_MODEL });

      try {
        const result = await LLMStreamRequest(
          OTelRequestSpan(req),
          config,
          messages,
          (delta) => send("delta", { text: delta }),
          abortController.signal
        );
        logger.info(
          `LLM chat stream completed in ${result.latencyMs}ms`,
          OTelRequestSpan(req)
        );
        send("done", { latencyMs: result.latencyMs });
      } catch (error) {
        logger.error(
          `LLM chat stream failed: ${error.message}`,
          error,
          OTelRequestSpan(req)
        );
        if (!raw.writableEnded && !raw.destroyed) {
          send("error", { message: error.message });
        }
      } finally {
        raw.end();
      }
    });
  }
}
