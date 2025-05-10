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
exports.UsersData = void 0;
const User_1 = require("../model/User");
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
const SqlDbUtils_1 = require("./SqlDbUtils");
class UsersData {
    //
    static get(context, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("UsersData_get", context);
            const usersRaw = yield SqlDbUtils_1.SqlDbutils.querySQL(span, "SELECT * FROM users WHERE id=?", [id]);
            let user = null;
            if (usersRaw.length > 0) {
                user = UsersData.fromRaw(usersRaw[0]);
            }
            span.end();
            return user;
        });
    }
    static getByName(context, name) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("UsersData_getByName", context);
            const usersRaw = yield SqlDbUtils_1.SqlDbutils.querySQL(span, "SELECT * FROM users WHERE name=?", [name]);
            let user = null;
            if (usersRaw.length > 0) {
                user = UsersData.fromRaw(usersRaw[0]);
            }
            span.end();
            return user;
        });
    }
    static list(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("UsersData_list", context);
            const usersRaw = yield SqlDbUtils_1.SqlDbutils.querySQL(span, "SELECT * FROM users");
            const users = [];
            for (const userRaw of usersRaw) {
                users.push(UsersData.fromRaw(userRaw));
            }
            span.end();
            return users;
        });
    }
    static add(context, user) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("UsersData_add", context);
            yield SqlDbUtils_1.SqlDbutils.execSQL(span, "INSERT INTO users (id,name,passwordEncrypted) VALUES (?, ?, ?)", [
                user.id,
                user.name,
                user.passwordEncrypted,
            ]);
            span.end();
        });
    }
    static update(context, user) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("UsersData_update", context);
            yield SqlDbUtils_1.SqlDbutils.execSQL(span, "UPDATE users SET passwordEncrypted = ? WHERE id = ? ", [
                user.passwordEncrypted,
                user.id,
            ]);
            span.end();
        });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static fromRaw(userRaw) {
        const user = new User_1.User();
        user.id = userRaw.id;
        user.name = userRaw.name;
        user.passwordEncrypted = userRaw.passwordEncrypted;
        return user;
    }
}
exports.UsersData = UsersData;
