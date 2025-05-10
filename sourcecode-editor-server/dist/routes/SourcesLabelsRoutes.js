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
exports.SourcesLabelsRoutes = void 0;
const Auth_1 = require("../data/Auth");
const SourceLabelsData_1 = require("../data/SourceLabelsData");
const SourcesData_1 = require("../data/SourcesData");
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
class SourcesLabelsRoutes {
    //
    getRoutes(fastify) {
        return __awaiter(this, void 0, void 0, function* () {
            //
            fastify.get("/", (req, res) => __awaiter(this, void 0, void 0, function* () {
                const userSession = yield Auth_1.Auth.getUserSession(req);
                if (!userSession.isAuthenticated) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                const sourceLabels = yield SourceLabelsData_1.SourceLabelsData.listForUser(StandardTracer_1.StandardTracer.getSpanFromRequest(req), userSession.userId);
                return res.status(201).send({ sourceLabels });
            }));
            fastify.get("/counts/unread", (req, res) => __awaiter(this, void 0, void 0, function* () {
                const userSession = yield Auth_1.Auth.getUserSession(req);
                if (!userSession.isAuthenticated) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                const counts = yield SourcesData_1.SourcesData.listCountsForUser(StandardTracer_1.StandardTracer.getSpanFromRequest(req), userSession.userId);
                return res.status(201).send({ counts });
            }));
        });
    }
}
exports.SourcesLabelsRoutes = SourcesLabelsRoutes;
