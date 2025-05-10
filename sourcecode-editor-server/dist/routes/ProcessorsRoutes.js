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
exports.ProcessorsRoutes = void 0;
const Auth_1 = require("../data/Auth");
const processors_1 = require("../procesors/processors");
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
class ProcessorsRoutes {
    //
    getRoutes(fastify) {
        return __awaiter(this, void 0, void 0, function* () {
            //
            fastify.get("/", (req, res) => __awaiter(this, void 0, void 0, function* () {
                res.status(200).send(yield processors_1.Processors.getInfos(StandardTracer_1.StandardTracer.getSpanFromRequest(req)));
            }));
            fastify.get("/status", (req, res) => __awaiter(this, void 0, void 0, function* () {
                const userSession = yield Auth_1.Auth.getUserSession(req);
                if (!userSession.isAuthenticated) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                res.status(200).send(processors_1.Processors.getUserProcessorInfo(StandardTracer_1.StandardTracer.getSpanFromRequest(req), userSession.userId));
            }));
        });
    }
}
exports.ProcessorsRoutes = ProcessorsRoutes;
