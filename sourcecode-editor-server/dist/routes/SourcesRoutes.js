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
exports.SourcesRoutes = void 0;
const Auth_1 = require("../data/Auth");
const SourcesData_1 = require("../data/SourcesData");
const Source_1 = require("../model/Source");
const processors_1 = require("../procesors/processors");
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
class SourcesRoutes {
    //
    getRoutes(fastify) {
        return __awaiter(this, void 0, void 0, function* () {
            //
            fastify.get("/", (req, res) => __awaiter(this, void 0, void 0, function* () {
                const userSession = yield Auth_1.Auth.getUserSession(req);
                if (!userSession.isAuthenticated) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                const sources = yield SourcesData_1.SourcesData.listForUser(StandardTracer_1.StandardTracer.getSpanFromRequest(req), userSession.userId);
                return res.status(200).send({ sources });
            }));
            fastify.post("/", (req, res) => __awaiter(this, void 0, void 0, function* () {
                const userSession = yield Auth_1.Auth.getUserSession(req);
                if (!userSession.isAuthenticated) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                const source = new Source_1.Source();
                source.name = req.body.url;
                source.info = { url: req.body.url };
                source.userId = userSession.userId;
                yield processors_1.Processors.checkSource(StandardTracer_1.StandardTracer.getSpanFromRequest(req), source);
                if (!source.info.processorPath) {
                    return res.status(400).send({ error: "Source Not Supported (No Processor Matching)" });
                }
                yield SourcesData_1.SourcesData.add(StandardTracer_1.StandardTracer.getSpanFromRequest(req), source);
                processors_1.Processors.fetchSourceItems(StandardTracer_1.StandardTracer.getSpanFromRequest(req), source);
                return res.status(201).send(source.toJson());
            }));
            fastify.put("/fetch", (req, res) => __awaiter(this, void 0, void 0, function* () {
                const userSession = yield Auth_1.Auth.getUserSession(req);
                if (!userSession.isAuthenticated) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                processors_1.Processors.fetchSourceItemsForUser(StandardTracer_1.StandardTracer.getSpanFromRequest(req), userSession.userId);
                return res.status(201).send({});
            }));
        });
    }
}
exports.SourcesRoutes = SourcesRoutes;
