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
exports.Auth = void 0;
const jwt = require("jsonwebtoken");
const path = require("path");
const uuid_1 = require("uuid");
const Logger_1 = require("../utils-std-ts/Logger");
const SqlDbUtils_1 = require("./SqlDbUtils");
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
const logger = new Logger_1.Logger(path.basename(__filename));
let config;
class Auth {
    //
    static init(context, configIn) {
        return __awaiter(this, void 0, void 0, function* () {
            config = configIn;
            const span = StandardTracer_1.StandardTracer.startSpan("Auth_init", context);
            const authKeyRaw = yield SqlDbUtils_1.SqlDbutils.querySQL(span, 'SELECT * FROM metadata WHERE type="auth_token"');
            if (authKeyRaw.length == 0) {
                configIn.JWT_KEY = (0, uuid_1.v4)();
                yield SqlDbUtils_1.SqlDbutils.querySQL(span, 'INSERT INTO metadata (type, value, dateCreated) VALUES ("auth_token", ?, ?)', [
                    configIn.JWT_KEY,
                    new Date().toISOString(),
                ]);
            }
            else {
                configIn.JWT_KEY = authKeyRaw[0].value;
            }
            span.end();
        });
    }
    static generateJWT(user) {
        return __awaiter(this, void 0, void 0, function* () {
            return jwt.sign({
                exp: Math.floor(Date.now() / 1000) + config.JWT_VALIDITY_DURATION,
                userId: user.id,
                userName: user.name,
            }, config.JWT_KEY);
        });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static mustBeAuthenticated(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            let authenticated = false;
            if (req.headers.authorization) {
                try {
                    jwt.verify(req.headers.authorization.split(" ")[1], config.JWT_KEY);
                    authenticated = true;
                }
                catch (err) {
                    authenticated = false;
                }
            }
            if (!authenticated) {
                res.status(403).send({ error: "Access Denied" });
                throw new Error("Access Denied");
            }
        });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static getUserSession(req) {
        return __awaiter(this, void 0, void 0, function* () {
            const userSession = { isAuthenticated: false };
            if (req.headers.authorization) {
                try {
                    const info = jwt.verify(req.headers.authorization.split(" ")[1], config.JWT_KEY);
                    userSession.userId = info.userId;
                    userSession.isAuthenticated = true;
                }
                catch (err) {
                    logger.error(err);
                }
            }
            return userSession;
        });
    }
}
exports.Auth = Auth;
