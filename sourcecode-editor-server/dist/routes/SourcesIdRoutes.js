"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourcesIdRoutes = void 0;
const Auth_1 = require("../data/Auth");
const SourceLabelsData_1 = require("../data/SourceLabelsData");
const SourcesData_1 = require("../data/SourcesData");
const processors_1 = require("../procesors/processors");
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
class SourcesIdRoutes {
    //
    getRoutes(fastify) {
        return __awaiter(this, void 0, void 0, function* () {
            fastify.get("/", (req, res) => __awaiter(this, void 0, void 0, function* () {
                const userSession = yield Auth_1.Auth.getUserSession(req);
                if (!userSession.isAuthenticated) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                const source = yield SourcesData_1.SourcesData.get(StandardTracer_1.StandardTracer.getSpanFromRequest(req), req.params.sourceId);
                if (userSession.userId !== source.userId) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                return res.status(200).send(source);
            }));
            fastify.get("/labels", (req, res) => __awaiter(this, void 0, void 0, function* () {
                const userSession = yield Auth_1.Auth.getUserSession(req);
                if (!userSession.isAuthenticated) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                const source = yield SourcesData_1.SourcesData.get(StandardTracer_1.StandardTracer.getSpanFromRequest(req), req.params.sourceId);
                if (userSession.userId !== source.userId) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                const labels = yield SourceLabelsData_1.SourceLabelsData.getSourceLabels(StandardTracer_1.StandardTracer.getSpanFromRequest(req), req.params.sourceId);
                return res.status(200).send({ labels: labels });
            }));
            fastify.put("/", (req, res) => __awaiter(this, void 0, void 0, function* () {
                const userSession = yield Auth_1.Auth.getUserSession(req);
                if (!userSession.isAuthenticated) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                const source = yield SourcesData_1.SourcesData.get(StandardTracer_1.StandardTracer.getSpanFromRequest(req), req.params.sourceId);
                if (userSession.userId !== source.userId) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                if (!req.body.name) {
                    return res.status(401).send({ error: "Parameter missing: name" });
                }
                source.name = req.body.name;
                yield SourcesData_1.SourcesData.update(StandardTracer_1.StandardTracer.getSpanFromRequest(req), source);
                if (req.body.labels && req.body.labels.length > 0) {
                    yield SourceLabelsData_1.SourceLabelsData.setSourceLabels(StandardTracer_1.StandardTracer.getSpanFromRequest(req), source.id, req.body.labels);
                }
                processors_1.Processors.checkSource(StandardTracer_1.StandardTracer.getSpanFromRequest(req), source).then(() => {
                    processors_1.Processors.fetchSourceItems(StandardTracer_1.StandardTracer.getSpanFromRequest(req), source);
                });
                return res.status(202).send();
            }));
            fastify.delete("/", (req, res) => __awaiter(this, void 0, void 0, function* () {
                const userSession = yield Auth_1.Auth.getUserSession(req);
                if (!userSession.isAuthenticated) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                const source = yield SourcesData_1.SourcesData.get(StandardTracer_1.StandardTracer.getSpanFromRequest(req), req.params.sourceId);
                if (userSession.userId !== source.userId) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                yield SourcesData_1.SourcesData.delete(StandardTracer_1.StandardTracer.getSpanFromRequest(req), req.params.sourceId);
                return res.status(203).send();
            }));
            fastify.put("/fetch", (req, res) => __awaiter(this, void 0, void 0, function* () {
                const userSession = yield Auth_1.Auth.getUserSession(req);
                if (!userSession.isAuthenticated) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                const source = yield SourcesData_1.SourcesData.get(StandardTracer_1.StandardTracer.getSpanFromRequest(req), req.params.sourceId);
                if (userSession.userId !== source.userId) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                processors_1.Processors.fetchSourceItems(StandardTracer_1.StandardTracer.getSpanFromRequest(req), source);
                return res.status(201).send();
            }));
        });
    }
}
exports.SourcesIdRoutes = SourcesIdRoutes;
