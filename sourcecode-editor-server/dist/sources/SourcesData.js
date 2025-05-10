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
exports.SourcesDataInvalidateUserCache = exports.SourcesDataDelete = exports.SourcesDataUpdate = exports.SourcesDataAdd = exports.SourcesDataListAll = exports.SourcesDataListCountsSavedForUser = exports.SourcesDataListCountsForUser = exports.SourcesDataListForUser = exports.SourcesDataGet = void 0;
const Source_1 = require("../model/Source");
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
const Timeout_1 = require("../utils-std-ts/Timeout");
const SqlDbUtils_1 = require("../utils-std-ts/SqlDbUtils");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cacheUserCounts = {};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cacheUserSavedCounts = {};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cacheInProgress = {};
function SourcesDataGet(context, sourceId) {
    var arguments_1 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_1.callee.name, context);
        const sourceRaw = yield (0, SqlDbUtils_1.SqlDbUtilsQuerySQL)(span, "SELECT * FROM sources WHERE id = ?", [sourceId]);
        let source = null;
        if (sourceRaw.length > 0) {
            source = fromRaw(sourceRaw[0]);
        }
        span.end();
        return source;
    });
}
exports.SourcesDataGet = SourcesDataGet;
function SourcesDataListForUser(context, userId) {
    var arguments_2 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_2.callee.name, context);
        const sourcesRaw = yield (0, SqlDbUtils_1.SqlDbUtilsQuerySQL)(span, `SELECT * FROM sources WHERE userId = '${userId}'`);
        const sources = [];
        for (const sourceRaw of sourcesRaw) {
            sources.push(fromRaw(sourceRaw));
        }
        span.end();
        return sources;
    });
}
exports.SourcesDataListForUser = SourcesDataListForUser;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SourcesDataListCountsForUser(context_1, userId_1) {
    var arguments_3 = arguments;
    return __awaiter(this, arguments, void 0, function* (context, userId, skipCache = false) {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_3.callee.name, context);
        if (cacheUserCounts[userId] && !skipCache) {
            span.setAttribute("cached", true);
            span.end();
            return cacheUserCounts[userId];
        }
        cacheUserCounts[userId] = yield (0, SqlDbUtils_1.SqlDbUtilsQuerySQL)(span, "SELECT COUNT(id) as unreadCount, sourceId FROM sources_items " +
            "WHERE sourceId IN (" +
            "    SELECT id FROM sources " +
            "    WHERE userId = ? " +
            "  ) " +
            "  AND status = ? " +
            "GROUP BY sourceId ", [userId, "unread"]);
        span.end();
        return cacheUserCounts[userId];
    });
}
exports.SourcesDataListCountsForUser = SourcesDataListCountsForUser;
function SourcesDataListCountsSavedForUser(context_1, userId_1) {
    var arguments_4 = arguments;
    return __awaiter(this, arguments, void 0, function* (context, userId, skipCache = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_4.callee.name, context);
        if (cacheUserSavedCounts[userId] && !skipCache) {
            span.setAttribute("cached", true);
            span.end();
            return cacheUserSavedCounts[userId];
        }
        cacheUserSavedCounts[userId] = yield (0, SqlDbUtils_1.SqlDbUtilsQuerySQL)(span, "SELECT COUNT(id) as savedCount, sourceId  " +
            "FROM sources_items " +
            "WHERE id IN (" +
            "    SELECT sources_items.id " +
            "    FROM lists_items, sources_items, sources " +
            "    WHERE lists_items.itemId = sources_items.id " +
            "          AND sources_items.sourceId = sources.id " +
            "          AND sources.userId = ? " +
            "  ) " +
            "GROUP BY sourceId ", [userId]);
        span.end();
        return cacheUserSavedCounts[userId];
    });
}
exports.SourcesDataListCountsSavedForUser = SourcesDataListCountsSavedForUser;
function SourcesDataListAll(context) {
    var arguments_5 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_5.callee.name, context);
        const sourcesRaw = yield (0, SqlDbUtils_1.SqlDbUtilsQuerySQL)(span, `SELECT * FROM sources`);
        const sources = [];
        for (const sourceRaw of sourcesRaw) {
            sources.push(fromRaw(sourceRaw));
        }
        span.end();
        return sources;
    });
}
exports.SourcesDataListAll = SourcesDataListAll;
function SourcesDataAdd(context, source) {
    var arguments_6 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_6.callee.name, context);
        yield (0, SqlDbUtils_1.SqlDbUtilsQuerySQL)(span, "INSERT INTO sources (id,userId,name,info) VALUES (?,?,?,?)", [
            source.id,
            source.userId,
            source.name,
            JSON.stringify(source.info),
        ]);
        span.end();
    });
}
exports.SourcesDataAdd = SourcesDataAdd;
function SourcesDataUpdate(context, source) {
    var arguments_7 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_7.callee.name, context);
        yield (0, SqlDbUtils_1.SqlDbUtilsExecSQL)(span, "UPDATE sources SET name = ?, info = ? WHERE id = ?", [
            source.name,
            JSON.stringify(source.info),
            source.id,
        ]);
        span.end();
    });
}
exports.SourcesDataUpdate = SourcesDataUpdate;
function SourcesDataDelete(context, sourceId) {
    var arguments_8 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_8.callee.name, context);
        const source = yield SourcesDataGet(span, sourceId);
        yield (0, SqlDbUtils_1.SqlDbUtilsExecSQL)(span, "DELETE FROM sources WHERE id = ?", [sourceId]);
        yield (0, SqlDbUtils_1.SqlDbUtilsExecSQL)(span, "DELETE FROM sources_items WHERE sourceId = ?", [sourceId]);
        yield (0, SqlDbUtils_1.SqlDbUtilsExecSQL)(span, "DELETE FROM sources_labels WHERE sourceId = ?", [sourceId]);
        SourcesDataInvalidateUserCache(span, source.userId);
        span.end();
    });
}
exports.SourcesDataDelete = SourcesDataDelete;
function SourcesDataInvalidateUserCache(context, userId) {
    var arguments_9 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        if (cacheInProgress[userId]) {
            cacheInProgress[userId] = 0;
        }
        if (cacheInProgress[userId] > 0) {
            cacheInProgress[userId]++;
            return;
        }
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_9.callee.name, context);
        SourcesDataListCountsForUser(span, userId, true);
        SourcesDataListCountsSavedForUser(span, userId, true);
        span.end();
        (0, Timeout_1.TimeoutWait)(1000).finally(() => {
            if (cacheInProgress[userId] > 1) {
                const newSpan = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_9.callee.name);
                cacheInProgress[userId] = 0;
                SourcesDataInvalidateUserCache(context, userId).finally(() => {
                    newSpan.end();
                });
            }
            else {
                cacheInProgress[userId] = 0;
            }
        });
    });
}
exports.SourcesDataInvalidateUserCache = SourcesDataInvalidateUserCache;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromRaw(sourceRaw) {
    const source = new Source_1.Source();
    source.id = sourceRaw.id;
    source.userId = sourceRaw.userId;
    source.name = sourceRaw.name;
    source.info = JSON.parse(sourceRaw.info);
    return source;
}
