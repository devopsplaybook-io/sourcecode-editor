import { StandardMeter, StandardTracer } from "@devopsplaybook.io/otel-utils";
import { StandardTracerFastifyRegisterHooks } from "@devopsplaybook.io/otel-utils-fastify";
import Fastify, { FastifyInstance } from "fastify";
import { watchFile } from "fs-extra";
import * as path from "path";
import { Config } from "./Config";
import {
  OTelLogger,
  OTelSetMeter,
  OTelSetTracer,
  OTelTracer,
} from "./OTelContext";
import { AuthInit } from "./users/Auth";
import { UsersRoutes } from "./users/UsersRoutes";
import { SqlDbUtilsInit } from "./utils-std-ts/SqlDbUtils";
import { SSHInit } from "./ssh/SSH";
import { SSHRoutes } from "./ssh/SSHRoutes";
import { ProjectsRoutes } from "./projects/ProjectsRoutes";
import { ProjectsOperationsRoutes } from "./projects/ProjectsOperationsRoutes";
import { GitInit } from "./git/Git";
import { ProjectsSyncInit } from "./projects/ProjectsSync";
import { ProjectsFilesRoutes } from "./projects/ProjectsFilesRoutes";
import { FilesInit } from "./files/Files";
import { ProjectsLLMRoutes } from "./projects/ProjectsLLMRoutes";
import { RepositoryEventsWebSocket } from "./events/WebSocketRoutes";
import { GitHubRoutes } from "./github/GitHubRoutes";

const logger = OTelLogger().createModuleLogger("app");

logger.info("====== Starting sourcecode-editor Server ======");

Promise.resolve().then(async () => {
  //
  const config = new Config();
  await config.reload();
  watchFile(config.CONFIG_FILE, () => {
    logger.info(`Config updated: ${config.CONFIG_FILE}`);
    config.reload();
  });

  OTelSetTracer(new StandardTracer(config));
  OTelSetMeter(new StandardMeter(config));
  OTelLogger().initOTel(config);

  const span = OTelTracer().startSpan("init");

  await SqlDbUtilsInit(span, config);
  await AuthInit(span, config);
  await GitInit(span, config);
  await SSHInit(span, config);
  await ProjectsSyncInit(span, config);
  await FilesInit(span, config);

  span.end();

  // API

  const fastify = Fastify({
    logger: config.LOG_LEVEL === process.env.FASTIFY_LOG_LEVEL,
  });

  if (config.CORS_POLICY_ORIGIN) {
    /* eslint-disable-next-line */
    fastify.register(require("@fastify/cors"), {
      origin: config.CORS_POLICY_ORIGIN,
      methods: "GET,PUT,POST,DELETE",
    });
  }
  /* eslint-disable-next-line */
  fastify.register(require("@fastify/multipart"));
  /* eslint-disable-next-line */
  fastify.register(require("@fastify/websocket"));

  // Generic event broadcast WebSocket.
  const repositoryEventsWS = new RepositoryEventsWebSocket();
  fastify.register(
    async (instance) => {
      repositoryEventsWS.registerRoutes(instance, config);
    },
    { prefix: "/api/events" },
  );

  StandardTracerFastifyRegisterHooks(fastify, OTelTracer(), OTelLogger(), {
    ignoreList: ["GET-/api/status"],
  });

  fastify.register(new UsersRoutes().getRoutes, {
    prefix: "/api/users",
  });
  fastify.register(new ProjectsRoutes().getRoutes, {
    prefix: "/api/projects",
  });
  fastify.register(new ProjectsOperationsRoutes().getRoutes, {
    prefix: "/api/projects/:projectId/operations",
  });
  fastify.register(new ProjectsFilesRoutes().getRoutes, {
    prefix: "/api/projects/:projectId/files",
  });
  const projectsLLMRoutes = new ProjectsLLMRoutes();
  fastify.register(
    async (instance: FastifyInstance) => {
      await projectsLLMRoutes.getRoutes(instance, config);
    },
    { prefix: "/api/projects/:projectId/llm" },
  );
  fastify.register(new SSHRoutes().getRoutes, {
    prefix: "/api/ssh",
  });
  fastify.register(
    async (instance: FastifyInstance) => {
      await new GitHubRoutes().getRoutes(instance, config);
    },
    { prefix: "/api/github" },
  );
  fastify.get("/api/status", async () => {
    return { started: true };
  });

  /* eslint-disable-next-line */
  fastify.register(require("@fastify/static"), {
    root: path.join(__dirname, "../web"),
    prefix: "/",
  });

  fastify.setNotFoundHandler((request, reply) => {
    if (
      request.raw.url &&
      !request.raw.url.startsWith("/api/") &&
      !path.extname(request.raw.url)
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (reply as any).sendFile("index.html");
    }
    reply.status(404).send({ error: "Not Found" });
  });

  fastify.listen({ port: config.API_PORT, host: "0.0.0.0" }, (err) => {
    if (err) {
      logger.error("Error starting API", err);
      process.exit(1);
    }
    logger.info("API Listening");
  });
});
