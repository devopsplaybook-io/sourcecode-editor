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
exports.UserIdRoutes = void 0;
const Auth_1 = require("../data/Auth");
const UserPassword_1 = require("../data/UserPassword");
const User_1 = require("../model/User");
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
let usersData;
class UserIdRoutes {
    //
    constructor(usersDataIn) {
        usersData = usersDataIn;
    }
    getRoutes(fastify) {
        return __awaiter(this, void 0, void 0, function* () {
            fastify.get("/", (req, res) => __awaiter(this, void 0, void 0, function* () {
                Auth_1.Auth.mustBeAuthenticated(req, res);
                const user = yield usersData.get(StandardTracer_1.StandardTracer.getSpanFromRequest(req), req.params.userId);
                if (!user) {
                    return res.status(404).send({ error: "Not Found" });
                }
                delete user.passwordEncrypted;
                res.status(201).send(user);
            }));
            fastify.put("/", (req, res) => __awaiter(this, void 0, void 0, function* () {
                Auth_1.Auth.mustBeAuthenticated(req, res);
                const user = yield usersData.get(StandardTracer_1.StandardTracer.getSpanFromRequest(req), req.params.userId);
                if (!user) {
                    return res.status(404).send({ error: "Not Found" });
                }
                const userUpddate = new User_1.User();
                if (!req.body.name) {
                    return res.status(400).send({ error: "Missing: Name" });
                }
                userUpddate.name = req.body.name;
                if (req.body.password) {
                    yield UserPassword_1.UserPassword.setPassword(StandardTracer_1.StandardTracer.getSpanFromRequest(req), userUpddate, req.body.password);
                }
                yield usersData.update(StandardTracer_1.StandardTracer.getSpanFromRequest(req), user.id, userUpddate);
                res.status(201).send({});
            }));
            fastify.delete("/", (req, res) => __awaiter(this, void 0, void 0, function* () {
                Auth_1.Auth.mustBeAuthenticated(req, res);
                const user = yield usersData.get(StandardTracer_1.StandardTracer.getSpanFromRequest(req), req.params.userId);
                if (!user) {
                    return res.status(404).send({ error: "Not Found" });
                }
                yield usersData.delete(StandardTracer_1.StandardTracer.getSpanFromRequest(req), user.id);
                res.status(201).send({});
            }));
        });
    }
}
exports.UserIdRoutes = UserIdRoutes;
