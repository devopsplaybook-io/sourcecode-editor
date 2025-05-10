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
exports.SourceItemsDataCleanupOrphans = exports.SourceItemsDataGetLastForSource = exports.SourceItemsDataUpdateMultipleStatusForUser = exports.SourceItemsDataDelete = exports.SourceItemsDataUpdate = exports.SourceItemsDataAdd = exports.SourceItemsDataGetForUser = void 0;
const SourceItem_1 = require("../model/SourceItem");
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
const SourcesData_1 = require("./SourcesData");
const SqlDbUtils_1 = require("../utils-std-ts/SqlDbUtils");
function SourceItemsDataGetForUser(context, itemId, userId) {
    var arguments_1 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_1.callee.name, context);
        const itemRaw = yield (0, SqlDbUtils_1.SqlDbUtilsQuerySQL)(span, "SELECT sources_items.*, sources.name as sourceName " +
            "FROM sources_items, sources " +
            "WHERE sources_items.id = ? " +
            "  AND sources.userId = ? " +
            "  AND sources.id = sources_items.sourceId ", [itemId, userId]);
        let sourceItem = null;
        if (itemRaw.length > 0) {
            sourceItem = SourceItem_1.SourceItem.fromRaw(itemRaw[0]);
        }
        span.end();
        return sourceItem;
    });
}
exports.SourceItemsDataGetForUser = SourceItemsDataGetForUser;
function SourceItemsDataAdd(context, sourceItem) {
    var arguments_2 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_2.callee.name, context);
        yield (0, SqlDbUtils_1.SqlDbUtilsQuerySQL)(span, "INSERT INTO sources_items " +
            "(id, sourceId, title, content, url, status, datePublished, info) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
            sourceItem.id,
            sourceItem.sourceId,
            sourceItem.title,
            sourceItem.content,
            sourceItem.url,
            sourceItem.status,
            sourceItem.datePublished.toISOString(),
            JSON.stringify(sourceItem.info),
        ]);
        const source = yield (0, SourcesData_1.SourcesDataGet)(span, sourceItem.sourceId);
        (0, SourcesData_1.SourcesDataInvalidateUserCache)(span, yield source.userId);
        span.end();
    });
}
exports.SourceItemsDataAdd = SourceItemsDataAdd;
function SourceItemsDataUpdate(context, sourceItem) {
    var arguments_3 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_3.callee.name, context);
        yield (0, SqlDbUtils_1.SqlDbUtilsQuerySQL)(span, "UPDATE sources_items " +
            " SET title = ?, content = ?, url = ?, status = ?, datePublished = ?, info = ? " +
            " WHERE id = ?", [
            sourceItem.title,
            sourceItem.content,
            sourceItem.url,
            sourceItem.status,
            sourceItem.datePublished.toISOString(),
            JSON.stringify(sourceItem.info),
            sourceItem.id,
        ]);
        const source = yield (0, SourcesData_1.SourcesDataGet)(span, sourceItem.sourceId);
        (0, SourcesData_1.SourcesDataInvalidateUserCache)(span, source.userId);
        span.end();
    });
}
exports.SourceItemsDataUpdate = SourceItemsDataUpdate;
function SourceItemsDataDelete(context, userId, sourceItemId) {
    var arguments_4 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_4.callee.name, context);
        yield (0, SqlDbUtils_1.SqlDbUtilsQuerySQL)(span, "DELETE FROM sources_items WHERE id = ?", [sourceItemId]);
        (0, SourcesData_1.SourcesDataInvalidateUserCache)(span, userId);
        span.end();
    });
}
exports.SourceItemsDataDelete = SourceItemsDataDelete;
function SourceItemsDataUpdateMultipleStatusForUser(context, itemIds, status, userId) {
    var arguments_5 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_5.callee.name, context);
        let inItemsId = "";
        for (const itemId of itemIds) {
            if (inItemsId.length > 0) {
                inItemsId += ",";
            }
            inItemsId += `"${itemId}"`;
        }
        yield (0, SqlDbUtils_1.SqlDbUtilsQuerySQL)(span, "UPDATE sources_items " +
            " SET status = ? " +
            " WHERE id IN ( " +
            "   SELECT sources_items.id " +
            "   FROM sources_items, sources " +
            `   WHERE sources_items.id IN (${inItemsId}) ` +
            "         AND sources_items.sourceId = sources.id " +
            "         AND sources.userId = ? " +
            " )", [status, userId]);
        (0, SourcesData_1.SourcesDataInvalidateUserCache)(span, userId);
        span.end();
    });
}
exports.SourceItemsDataUpdateMultipleStatusForUser = SourceItemsDataUpdateMultipleStatusForUser;
function SourceItemsDataGetLastForSource(context, sourceId) {
    var arguments_6 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_6.callee.name, context);
        let sourceItem = null;
        const sourceItemRaw = yield (0, SqlDbUtils_1.SqlDbUtilsQuerySQL)(span, "SELECT * FROM sources_items WHERE sourceId = ? ORDER BY datePublished DESC LIMIT 1", [sourceId]);
        if (sourceItemRaw.length > 0) {
            sourceItem = SourceItem_1.SourceItem.fromRaw(sourceItemRaw[0]);
        }
        span.end();
        return sourceItem;
    });
}
exports.SourceItemsDataGetLastForSource = SourceItemsDataGetLastForSource;
function SourceItemsDataCleanupOrphans(context) {
    var arguments_7 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_7.callee.name, context);
        yield (0, SqlDbUtils_1.SqlDbUtilsQuerySQL)(span, "DELETE FROM sources_items WHERE sourceId NOT IN (SELECT id FROM sources)");
        span.end();
    });
}
exports.SourceItemsDataCleanupOrphans = SourceItemsDataCleanupOrphans;
