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
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
const Processors_1 = require("../procesors/Processors");
const SourcesData_1 = require("./SourcesData");
const SourceLabelsData_1 = require("./SourceLabelsData");
const Auth_1 = require("../users/Auth");
class SourcesIdRoutes {
    //
    getRoutes(fastify) {
        return __awaiter(this, void 0, void 0, function* () {
            fastify.get("/", (req, res) => __awaiter(this, void 0, void 0, function* () {
                const userSession = yield (0, Auth_1.AuthGetUserSession)(req);
                if (!userSession.isAuthenticated) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                const source = yield (0, SourcesData_1.SourcesDataGet)((0, StandardTracer_1.StandardTracerGetSpanFromRequest)(req), req.params.sourceId);
                if (userSession.userId !== source.userId) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                return res.status(200).send(source);
            }));
            fastify.get("/labels", (req, res) => __awaiter(this, void 0, void 0, function* () {
                const userSession = yield (0, Auth_1.AuthGetUserSession)(req);
                if (!userSession.isAuthenticated) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                const source = yield (0, SourcesData_1.SourcesDataGet)((0, StandardTracer_1.StandardTracerGetSpanFromRequest)(req), req.params.sourceId);
                if (userSession.userId !== source.userId) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                const labels = yield (0, SourceLabelsData_1.SourceLabelsDataGetSourceLabels)((0, StandardTracer_1.StandardTracerGetSpanFromRequest)(req), req.params.sourceId);
                return res.status(200).send({ labels: labels });
            }));
            fastify.put("/", (req, res) => __awaiter(this, void 0, void 0, function* () {
                const userSession = yield (0, Auth_1.AuthGetUserSession)(req);
                if (!userSession.isAuthenticated) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                const source = yield (0, SourcesData_1.SourcesDataGet)((0, StandardTracer_1.StandardTracerGetSpanFromRequest)(req), req.params.sourceId);
                if (userSession.userId !== source.userId) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                if (!req.body.name) {
                    return res.status(401).send({ error: "Parameter missing: name" });
                }
                source.name = req.body.name;
                yield (0, SourcesData_1.SourcesDataUpdate)((0, StandardTracer_1.StandardTracerGetSpanFromRequest)(req), source);
                if (req.body.labels && req.body.labels.length > 0) {
                    yield (0, SourceLabelsData_1.SourceLabelsDataSetSourceLabels)((0, StandardTracer_1.StandardTracerGetSpanFromRequest)(req), source.id, req.body.labels);
                }
                (0, Processors_1.ProcessorsCheckSource)((0, StandardTracer_1.StandardTracerGetSpanFromRequest)(req), source).then(() => {
                    (0, Processors_1.ProcessorsFetchSourceItems)((0, StandardTracer_1.StandardTracerGetSpanFromRequest)(req), source);
                });
                return res.status(202).send();
            }));
            fastify.delete("/", (req, res) => __awaiter(this, void 0, void 0, function* () {
                const userSession = yield (0, Auth_1.AuthGetUserSession)(req);
                if (!userSession.isAuthenticated) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                const source = yield (0, SourcesData_1.SourcesDataGet)((0, StandardTracer_1.StandardTracerGetSpanFromRequest)(req), req.params.sourceId);
                if (userSession.userId !== source.userId) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                yield (0, SourcesData_1.SourcesDataDelete)((0, StandardTracer_1.StandardTracerGetSpanFromRequest)(req), req.params.sourceId);
                return res.status(203).send();
            }));
            fastify.put("/fetch", (req, res) => __awaiter(this, void 0, void 0, function* () {
                const userSession = yield (0, Auth_1.AuthGetUserSession)(req);
                if (!userSession.isAuthenticated) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                const source = yield (0, SourcesData_1.SourcesDataGet)((0, StandardTracer_1.StandardTracerGetSpanFromRequest)(req), req.params.sourceId);
                if (userSession.userId !== source.userId) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                (0, Processors_1.ProcessorsFetchSourceItems)((0, StandardTracer_1.StandardTracerGetSpanFromRequest)(req), source);
                return res.status(201).send();
            }));
        });
    }
}
exports.SourcesIdRoutes = SourcesIdRoutes;
