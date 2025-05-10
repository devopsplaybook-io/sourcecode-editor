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
exports.SourcesImportRoutes = void 0;
const opml = require("opml");
const lodash_1 = require("lodash");
const Logger_1 = require("../utils-std-ts/Logger");
const Source_1 = require("../model/Source");
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
const SourceLabelsData_1 = require("./SourceLabelsData");
const Auth_1 = require("../users/Auth");
const logger = new Logger_1.Logger("SourcesImportRoutes");
class SourcesImportRoutes {
  //
  getRoutes(fastify) {
    return __awaiter(this, void 0, void 0, function* () {
      //
      fastify.post("/analyze/opml", (req, res) =>
        __awaiter(this, void 0, void 0, function* () {
          const userSession = yield (0, Auth_1.AuthGetUserSession)(req);
          if (!userSession.isAuthenticated) {
            return res.status(403).send({ error: "Access Denied" });
          }
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data = yield req.file();
            const opmlText = (yield data.toBuffer()).toString();
            const opmlData = yield opmlLoad(opmlText);
            const sourcesOpml = [];
            yield opmlProcessSub(
              (0, StandardTracer_1.StandardTracerGetSpanFromRequest)(req),
              opmlData.opml.body.subs,
              "",
              sourcesOpml,
              userSession.userId
            );
            return res.status(200).send({ sources: sourcesOpml });
          } catch (err) {
            logger.error(err);
            return res.status(400).send({ error: "Invalid File" });
          }
        })
      );
      fastify.get("/export/opml", (req, res) =>
        __awaiter(this, void 0, void 0, function* () {
          const userSession = yield (0, Auth_1.AuthGetUserSession)(req);
          if (!userSession.isAuthenticated) {
            return res.status(403).send({ error: "Access Denied" });
          }
          const sourceLabels = yield (0, SourceLabelsData_1.SourceLabelsDataListForUser)(
            (0, StandardTracer_1.StandardTracerGetSpanFromRequest)(req),
            userSession.userId
          );
          const sourcesOutlines = {
            opml: { head: { title: "sourcecode-editor Source Export" }, body: { subs: [] } },
          };
          for (const source of sourceLabels) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sourceLabel = source;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newOutline = {
              text: sourceLabel.sourceName,
              type: sourceLabel.sourceInfo.icon,
              url: sourceLabel.sourceInfo.url,
            };
            if (newOutline.type === "rss") {
              newOutline.xmlUrl = sourceLabel.sourceInfo.url;
            }
            if (!sourceLabel.labelName) {
              sourcesOutlines.opml.body.subs.push(newOutline);
            } else {
              let parentSub = (0, lodash_1.find)(sourcesOutlines.opml.body.subs, { title: sourceLabel.labelName });
              if (!parentSub) {
                parentSub = { title: sourceLabel.labelName, subs: [] };
                sourcesOutlines.opml.body.subs.push(parentSub);
              }
              parentSub.subs.push(newOutline);
            }
          }
          res.header("Content-Disposition", "attachment; filename=data.opml");
          res.header("Content-Type", "text/plain");
          res.send(opml.stringify(sourcesOutlines));
        })
      );
    });
  }
}
exports.SourcesImportRoutes = SourcesImportRoutes;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function opmlLoad(text) {
  return new Promise((resolve, reject) => {
    opml.parse(text, (err, opmlObject) => {
      if (err) {
        reject(err);
      } else {
        resolve(opmlObject);
      }
    });
  });
}
function opmlProcessSub(
  context,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  opmlSub,
  parentFolder,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sourcesOpml,
  userId
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) {
  return __awaiter(this, void 0, void 0, function* () {
    for (const feed of opmlSub) {
      if (feed.xmlUrl || feed.url) {
        const source = new Source_1.Source();
        source.name = feed.text;
        source.info = { url: feed.xmlUrl ? feed.xmlUrl : feed.url };
        source.userId = userId;
        source.labels = [parentFolder];
        sourcesOpml.push(source);
      }
      if (feed.subs) {
        yield opmlProcessSub(
          context,
          feed.subs,
          `${parentFolder ? parentFolder + "/" : ""}${feed.title}`,
          sourcesOpml,
          userId
        );
      }
    }
  });
}
