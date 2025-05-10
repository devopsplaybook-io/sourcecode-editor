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
const User_1 = require("../model/User");
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
const UsersData_1 = require("./UsersData");
const UserPassword_1 = require("./UserPassword");
const Auth_1 = require("./Auth");
class UsersRoutes {
    //
    getRoutes(fastify) {
        return __awaiter(this, void 0, void 0, function* () {
            //
            fastify.get("/status/initialization", (req, res) => __awaiter(this, void 0, void 0, function* () {
                if ((yield (0, UsersData_1.UsersDataList)((0, StandardTracer_1.StandardTracerGetSpanFromRequest)(req))).length === 0) {
                    res.status(201).send({ initialized: false });
                }
                else {
                    res.status(201).send({ initialized: true });
                }
            }));
            fastify.post("/session", (req, res) => __awaiter(this, void 0, void 0, function* () {
                let user;
                // From token
                const userSession = yield (0, Auth_1.AuthGetUserSession)(req);
                if (userSession.isAuthenticated) {
                    user = yield (0, UsersData_1.UsersDataGet)((0, StandardTracer_1.StandardTracerGetSpanFromRequest)(req), userSession.userId);
                    return res.status(201).send({ success: true, token: yield (0, Auth_1.AuthGenerateJWT)(user) });
                }
                // From User/Pass
                if (!req.body.name) {
                    return res.status(400).send({ error: "Missing: Name" });
                }
                if (!req.body.password) {
                    return res.status(400).send({ error: "Missing: Password" });
                }
                user = yield (0, UsersData_1.UsersDataGetByName)((0, StandardTracer_1.StandardTracerGetSpanFromRequest)(req), req.body.name);
                if (!user) {
                    return res.status(403).send({ error: "Authentication Failed" });
                }
                else if (yield (0, UserPassword_1.UserPasswordCheckPassword)((0, StandardTracer_1.StandardTracerGetSpanFromRequest)(req), user, req.body.password)) {
                    return res.status(201).send({ success: true, token: yield (0, Auth_1.AuthGenerateJWT)(user) });
                }
                else {
                    return res.status(403).send({ error: "Authentication Failed" });
                }
            }));
            fastify.post("/", (req, res) => __awaiter(this, void 0, void 0, function* () {
                let isInitialized = true;
                if ((yield (0, UsersData_1.UsersDataList)((0, StandardTracer_1.StandardTracerGetSpanFromRequest)(req))).length === 0) {
                    isInitialized = false;
                }
                const userSession = yield (0, Auth_1.AuthGetUserSession)(req);
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
                if (yield (0, UsersData_1.UsersDataGetByName)((0, StandardTracer_1.StandardTracerGetSpanFromRequest)(req), req.body.name)) {
                    return res.status(400).send({ error: "Username Already Exists" });
                }
                newUser.name = req.body.name;
                yield (0, UserPassword_1.UserPasswordSetPassword)((0, StandardTracer_1.StandardTracerGetSpanFromRequest)(req), newUser, req.body.password);
                yield (0, UsersData_1.UsersDataAdd)((0, StandardTracer_1.StandardTracerGetSpanFromRequest)(req), newUser);
                res.status(201).send({});
            }));
            fastify.put("/password", (req, res) => __awaiter(this, void 0, void 0, function* () {
                const userSession = yield (0, Auth_1.AuthGetUserSession)(req);
                if (!userSession.isAuthenticated) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                const user = yield (0, UsersData_1.UsersDataGet)((0, StandardTracer_1.StandardTracerGetSpanFromRequest)(req), userSession.userId);
                if (!req.body.password || !req.body.password) {
                    return res.status(400).send({ error: "Missing: Password" });
                }
                if (!(yield (0, UserPassword_1.UserPasswordCheckPassword)((0, StandardTracer_1.StandardTracerGetSpanFromRequest)(req), user, req.body.passwordOld))) {
                    return res.status(403).send({ error: "Old Password Wrong" });
                }
                yield (0, UserPassword_1.UserPasswordSetPassword)((0, StandardTracer_1.StandardTracerGetSpanFromRequest)(req), user, req.body.password);
                yield (0, UsersData_1.UsersDataUpdate)((0, StandardTracer_1.StandardTracerGetSpanFromRequest)(req), user);
                res.status(201).send({});
            }));
        });
    }
}
exports.UsersRoutes = UsersRoutes;
