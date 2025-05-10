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
exports.RulesDataUpdate = exports.RulesDataListAll = exports.RulesDataListForUser = exports.RulesDataGet = void 0;
const Rules_1 = require("../model/Rules");
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
const SqlDbUtils_1 = require("../utils-std-ts/SqlDbUtils");
//
function RulesDataGet(context, ruleId) {
    var arguments_1 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_1.callee.name, context);
        const rulesRaw = yield (0, SqlDbUtils_1.SqlDbUtilsQuerySQL)(span, "SELECT * FROM rules WHERE id = ?", [ruleId]);
        let rules = new Rules_1.Rules();
        if (rulesRaw.length > 0) {
            rules = fromRaw(rulesRaw[0]);
        }
        span.end();
        return rules;
    });
}
exports.RulesDataGet = RulesDataGet;
function RulesDataListForUser(context, userId) {
    var arguments_2 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_2.callee.name, context);
        const rulesRaw = yield (0, SqlDbUtils_1.SqlDbUtilsQuerySQL)(span, `SELECT * FROM rules WHERE userId = '${userId}'`);
        let rules = new Rules_1.Rules();
        rules.userId = userId;
        for (const userRules of rulesRaw) {
            rules = fromRaw(userRules);
        }
        span.end();
        return rules;
    });
}
exports.RulesDataListForUser = RulesDataListForUser;
function RulesDataListAll(context) {
    var arguments_3 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_3.callee.name, context);
        const rulesRaw = yield (0, SqlDbUtils_1.SqlDbUtilsQuerySQL)(span, `SELECT * FROM rules`);
        const rules = [];
        for (const userRules of rulesRaw) {
            rules.push(fromRaw(userRules));
        }
        span.end();
        return rules;
    });
}
exports.RulesDataListAll = RulesDataListAll;
function RulesDataUpdate(context, rules) {
    var arguments_4 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_4.callee.name, context);
        yield (0, SqlDbUtils_1.SqlDbUtilsExecSQL)(span, "DELETE FROM rules WHERE userId = ?", [rules.userId]);
        yield (0, SqlDbUtils_1.SqlDbUtilsExecSQL)(span, "INSERT INTO rules (id,userId,info) VALUES (?,?,?)", [
            rules.id,
            rules.userId,
            JSON.stringify(rules.info),
        ]);
        span.end();
    });
}
exports.RulesDataUpdate = RulesDataUpdate;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromRaw(rulesRaw) {
    const rules = new Rules_1.Rules();
    rules.id = rulesRaw.id;
    rules.userId = rulesRaw.userId;
    rules.info = JSON.parse(rulesRaw.info);
    return rules;
}
