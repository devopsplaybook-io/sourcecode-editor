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
exports.Config = void 0;
const fse = require("fs-extra");
const uuid_1 = require("uuid");
const Logger_1 = require("./utils-std-ts/Logger");
const logger = new Logger_1.Logger("config");
class Config {
  constructor() {
    //
    this.CONFIG_FILE = "config.json";
    this.SERVICE_ID = "sourcecode-editor-server";
    this.VERSION = 1;
    this.API_PORT = 8080;
    this.JWT_VALIDITY_DURATION = 3 * 31 * 24 * 3600;
    this.DATA_DIR = process.env.DATA_DIR || "/data";
    this.JWT_KEY = (0, uuid_1.v4)();
    this.LOG_LEVEL = "info";
    this.SOURCE_FETCH_FREQUENCY = 30 * 60 * 1000;
    this.OPENTELEMETRY_COLLECTOR_HTTP = process.env.OPENTELEMETRY_COLLECTOR_HTTP || "";
    this.OPENTELEMETRY_COLLECTOR_AWS = process.env.OPENTELEMETRY_COLLECTOR_AWS === "true";
    this.PROCESSORS_SYSTEM = "processors-system";
    this.PROCESSORS_USER = "processors-user";
  }
  reload() {
    return __awaiter(this, void 0, void 0, function* () {
      const content = yield fse.readJson(this.CONFIG_FILE);
      const setIfSet = (field, displayLog = true) => {
        if (content[field]) {
          this[field] = content[field];
        }
        if (displayLog) {
          logger.info(`Configuration Value: ${field}: ${this[field]}`);
        } else {
          logger.info(`Configuration Value: ${field}: ********************`);
        }
      };
      logger.info(`Configuration Value: CONFIG_FILE: ${this.CONFIG_FILE}`);
      logger.info(`Configuration Value: VERSION: ${this.VERSION}`);
      setIfSet("JWT_VALIDITY_DURATION");
      setIfSet("CORS_POLICY_ORIGIN");
      setIfSet("DATA_DIR");
      setIfSet("JWT_KEY", false);
      setIfSet("LOG_LEVEL");
      setIfSet("SOURCE_FETCH_FREQUENCY");
      setIfSet("OPENTELEMETRY_COLLECTOR_HTTP");
      setIfSet("OPENTELEMETRY_COLLECTOR_AWS");
    });
  }
}
exports.Config = Config;
