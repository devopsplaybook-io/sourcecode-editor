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
exports.UsersDataUpdate = exports.UsersDataAdd = exports.UsersDataList = exports.UsersDataGetByName = exports.UsersDataGet = void 0;
const User_1 = require("../model/User");
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
const SqlDbUtils_1 = require("../utils-std-ts/SqlDbUtils");
function UsersDataGet(context, id) {
    var arguments_1 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_1.callee.name, context);
        const usersRaw = yield (0, SqlDbUtils_1.SqlDbUtilsQuerySQL)(span, "SELECT * FROM users WHERE id=?", [id]);
        let user = null;
        if (usersRaw.length > 0) {
            user = fromRaw(usersRaw[0]);
        }
        span.end();
        return user;
    });
}
exports.UsersDataGet = UsersDataGet;
function UsersDataGetByName(context, name) {
    var arguments_2 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_2.callee.name, context);
        const usersRaw = yield (0, SqlDbUtils_1.SqlDbUtilsQuerySQL)(span, "SELECT * FROM users WHERE name=?", [name]);
        let user = null;
        if (usersRaw.length > 0) {
            user = fromRaw(usersRaw[0]);
        }
        span.end();
        return user;
    });
}
exports.UsersDataGetByName = UsersDataGetByName;
function UsersDataList(context) {
    var arguments_3 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_3.callee.name, context);
        const usersRaw = yield (0, SqlDbUtils_1.SqlDbUtilsQuerySQL)(span, "SELECT * FROM users");
        const users = [];
        for (const userRaw of usersRaw) {
            users.push(fromRaw(userRaw));
        }
        span.end();
        return users;
    });
}
exports.UsersDataList = UsersDataList;
function UsersDataAdd(context, user) {
    var arguments_4 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_4.callee.name, context);
        yield (0, SqlDbUtils_1.SqlDbUtilsExecSQL)(span, "INSERT INTO users (id,name,passwordEncrypted) VALUES (?, ?, ?)", [
            user.id,
            user.name,
            user.passwordEncrypted,
        ]);
        span.end();
    });
}
exports.UsersDataAdd = UsersDataAdd;
function UsersDataUpdate(context, user) {
    var arguments_5 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_5.callee.name, context);
        yield (0, SqlDbUtils_1.SqlDbUtilsExecSQL)(span, "UPDATE users SET passwordEncrypted = ? WHERE id = ? ", [
            user.passwordEncrypted,
            user.id,
        ]);
        span.end();
    });
}
exports.UsersDataUpdate = UsersDataUpdate;
// Private Functions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromRaw(userRaw) {
    const user = new User_1.User();
    user.id = userRaw.id;
    user.name = userRaw.name;
    user.passwordEncrypted = userRaw.passwordEncrypted;
    return user;
}
