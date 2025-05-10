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
exports.RulesRoutes = void 0;
const Rules_1 = require("../model/Rules");
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
const RulesData_1 = require("./RulesData");
const Auth_1 = require("../users/Auth");
class RulesRoutes {
    //
    getRoutes(fastify) {
        return __awaiter(this, void 0, void 0, function* () {
            //
            fastify.get("/", (req, res) => __awaiter(this, void 0, void 0, function* () {
                const userSession = yield (0, Auth_1.AuthGetUserSession)(req);
                if (!userSession.isAuthenticated) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                const rules = yield (0, RulesData_1.RulesDataListForUser)((0, StandardTracer_1.StandardTracerGetSpanFromRequest)(req), userSession.userId);
                return res.status(200).send({ rules });
            }));
            fastify.put("/", (req, res) => __awaiter(this, void 0, void 0, function* () {
                const userSession = yield (0, Auth_1.AuthGetUserSession)(req);
                if (!userSession.isAuthenticated) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                const rules = Rules_1.Rules.fromJson(req.body.rules);
                rules.userId = userSession.userId;
                yield (0, RulesData_1.RulesDataUpdate)((0, StandardTracer_1.StandardTracerGetSpanFromRequest)(req), rules);
                return res.status(201).send({});
            }));
        });
    }
}
exports.RulesRoutes = RulesRoutes;
