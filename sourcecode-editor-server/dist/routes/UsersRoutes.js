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
exports.UsersRoutes = void 0;
const UserPassword_1 = require("../data/UserPassword");
const Auth_1 = require("../data/Auth");
const User_1 = require("../model/User");
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
const UsersData_1 = require("../data/UsersData");
class UsersRoutes {
    //
    getRoutes(fastify) {
        return __awaiter(this, void 0, void 0, function* () {
            //
            fastify.get("/status/initialization", (req, res) => __awaiter(this, void 0, void 0, function* () {
                if ((yield UsersData_1.UsersData.list(StandardTracer_1.StandardTracer.getSpanFromRequest(req))).length === 0) {
                    res.status(201).send({ initialized: false });
                }
                else {
                    res.status(201).send({ initialized: true });
                }
            }));
            fastify.post("/session", (req, res) => __awaiter(this, void 0, void 0, function* () {
                let user;
                // From token
                const userSession = yield Auth_1.Auth.getUserSession(req);
                if (userSession.isAuthenticated) {
                    user = yield UsersData_1.UsersData.get(StandardTracer_1.StandardTracer.getSpanFromRequest(req), userSession.userId);
                    return res.status(201).send({ success: true, token: yield Auth_1.Auth.generateJWT(user) });
                }
                // From User/Pass
                if (!req.body.name) {
                    return res.status(400).send({ error: "Missing: Name" });
                }
                if (!req.body.password) {
                    return res.status(400).send({ error: "Missing: Password" });
                }
                user = yield UsersData_1.UsersData.getByName(StandardTracer_1.StandardTracer.getSpanFromRequest(req), req.body.name);
                if (!user) {
                    return res.status(403).send({ error: "Authentication Failed" });
                }
                else if (yield UserPassword_1.UserPassword.checkPassword(StandardTracer_1.StandardTracer.getSpanFromRequest(req), user, req.body.password)) {
                    return res.status(201).send({ success: true, token: yield Auth_1.Auth.generateJWT(user) });
                }
                else {
                    return res.status(403).send({ error: "Authentication Failed" });
                }
            }));
            fastify.post("/", (req, res) => __awaiter(this, void 0, void 0, function* () {
                let isInitialized = true;
                if ((yield UsersData_1.UsersData.list(StandardTracer_1.StandardTracer.getSpanFromRequest(req))).length === 0) {
                    isInitialized = false;
                }
                const userSession = yield Auth_1.Auth.getUserSession(req);
                if (isInitialized && !userSession.isAuthenticated) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                const newUser = new User_1.User();
                if (!req.body.name) {
                    return res.status(400).send({ error: "Missing: Name" });
                }
                if (!req.body.password) {
                    return res.status(400).send({ error: "Missing: Password" });
                }
                if (yield UsersData_1.UsersData.getByName(StandardTracer_1.StandardTracer.getSpanFromRequest(req), req.body.name)) {
                    return res.status(400).send({ error: "Username Already Exists" });
                }
                newUser.name = req.body.name;
                yield UserPassword_1.UserPassword.setPassword(StandardTracer_1.StandardTracer.getSpanFromRequest(req), newUser, req.body.password);
                yield UsersData_1.UsersData.add(StandardTracer_1.StandardTracer.getSpanFromRequest(req), newUser);
                res.status(201).send({});
            }));
            fastify.put("/password", (req, res) => __awaiter(this, void 0, void 0, function* () {
                const userSession = yield Auth_1.Auth.getUserSession(req);
                if (!userSession.isAuthenticated) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                const user = yield UsersData_1.UsersData.get(StandardTracer_1.StandardTracer.getSpanFromRequest(req), userSession.userId);
                if (!req.body.password || !req.body.password) {
                    return res.status(400).send({ error: "Missing: Password" });
                }
                if (!(yield UserPassword_1.UserPassword.checkPassword(StandardTracer_1.StandardTracer.getSpanFromRequest(req), user, req.body.passwordOld))) {
                    return res.status(403).send({ error: "Old Password Wrong" });
                }
                yield UserPassword_1.UserPassword.setPassword(StandardTracer_1.StandardTracer.getSpanFromRequest(req), user, req.body.password);
                yield UsersData_1.UsersData.update(StandardTracer_1.StandardTracer.getSpanFromRequest(req), user);
                res.status(201).send({});
            }));
        });
    }
}
exports.UsersRoutes = UsersRoutes;
