"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = require("fastify");
const path = require("path");
const fs_extra_1 = require("fs-extra");
const Config_1 = require("./Config");
const Logger_1 = require("./utils-std-ts/Logger");
const UsersRoutes_1 = require("./users/UsersRoutes");
const ItemsRoutes_1 = require("./sources/ItemsRoutes");
const ProcessorsRoutes_1 = require("./procesors/ProcessorsRoutes");
const RulesRoutes_1 = require("./rules/RulesRoutes");
const SourcesRoutes_1 = require("./sources/SourcesRoutes");
const SourcesIdRoutes_1 = require("./sources/SourcesIdRoutes");
const SourcesLabelsRoutes_1 = require("./sources/SourcesLabelsRoutes");
const SourcesImportRoutes_1 = require("./sources/SourcesImportRoutes");
const ListsItemsRoutes_1 = require("./sources/ListsItemsRoutes");
const StandardTracer_1 = require("./utils-std-ts/StandardTracer");
const Processors_1 = require("./procesors/Processors");
const SqlDbUtils_1 = require("./utils-std-ts/SqlDbUtils");
const Scheduler_1 = require("./Scheduler");
const StandardTracerApi_1 = require("./StandardTracerApi");
const Auth_1 = require("./users/Auth");
const logger = new Logger_1.Logger("app");
logger.info("====== Starting sourcecode-editor Server ======");
Promise.resolve().then(() =>
  __awaiter(void 0, void 0, void 0, function* () {
    //
    const config = new Config_1.Config();
    yield config.reload();
    (0, fs_extra_1.watchFile)(config.CONFIG_FILE, () => {
      logger.info(`Config updated: ${config.CONFIG_FILE}`);
      config.reload();
    });
    (0, StandardTracer_1.StandardTracerInitTelemetry)(config);
    const span = (0, StandardTracer_1.StandardTracerStartSpan)("init");
    yield (0, SqlDbUtils_1.SqlDbUtilsInit)(span, config);
    yield (0, Auth_1.AuthInit)(span, config);
    yield (0, Processors_1.ProcessorsInit)(span, config);
    yield (0, Scheduler_1.SchedulerInit)(span, config);
    span.end();
    // API
    const fastify = (0, fastify_1.default)({
      logger: config.LOG_LEVEL === "debug_tmp",
      ignoreTrailingSlash: true,
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
    (0, StandardTracerApi_1.StandardTracerApiRegisterHooks)(fastify, config);
    fastify.register(new UsersRoutes_1.UsersRoutes().getRoutes, {
      prefix: "/api/users",
    });
    fastify.register(new SourcesRoutes_1.SourcesRoutes().getRoutes, {
      prefix: "/api/sources",
    });
    fastify.register(new ItemsRoutes_1.ItemsRoutes().getRoutes, {
      prefix: "/api/items",
    });
    fastify.register(new SourcesIdRoutes_1.SourcesIdRoutes().getRoutes, {
      prefix: "/api/sources/:sourceId",
    });
    fastify.register(new SourcesLabelsRoutes_1.SourcesLabelsRoutes().getRoutes, {
      prefix: "/api/sources/labels",
    });
    fastify.register(new SourcesImportRoutes_1.SourcesImportRoutes().getRoutes, {
      prefix: "/api/sources/import",
    });
    fastify.register(new ListsItemsRoutes_1.ListsItemsRoutes().getRoutes, {
      prefix: "/api/lists",
    });
    fastify.register(new ProcessorsRoutes_1.ProcessorsRoutes().getRoutes, {
      prefix: "/api/processors",
    });
    fastify.register(new RulesRoutes_1.RulesRoutes().getRoutes, {
      prefix: "/api/rules",
    });
    /* eslint-disable-next-line */
    fastify.register(require("@fastify/static"), {
      root: path.join(__dirname, "../web"),
      prefix: "/",
    });
    fastify.listen({ port: config.API_PORT, host: "0.0.0.0" }, (err) => {
      if (err) {
        logger.error(err);
        fastify.log.error(err);
        process.exit(1);
      }
      logger.info("API Listerning");
    });
  })
);
