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
exports.SourceItemsData = void 0;
const SourceItem_1 = require("../model/SourceItem");
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
const SqlDbUtils_1 = require("./SqlDbUtils");
class SourceItemsData {
    //
    static getForUser(context, itemId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("SourceItemsData_getForUser", context);
            const itemRaw = yield SqlDbUtils_1.SqlDbutils.querySQL(span, "SELECT sources_items.*, sources.name as sourceName " +
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
    static add(context, sourceItem) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("SourceItemsData_add", context);
            yield SqlDbUtils_1.SqlDbutils.execSQL(span, "INSERT INTO sources_items " +
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
            span.end();
        });
    }
    static update(context, sourceItem) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("SourceItemsData_update", context);
            yield SqlDbUtils_1.SqlDbutils.execSQL(span, "UPDATE sources_items " +
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
            span.end();
        });
    }
    static updateMultipleStatusForUser(context, itemIds, status, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("SourceItemsData_updateMultipleStatusForUser", context);
            let inItemsId = "";
            for (const itemId of itemIds) {
                if (inItemsId.length > 0) {
                    inItemsId += ",";
                }
                inItemsId += `"${itemId}"`;
            }
            yield SqlDbUtils_1.SqlDbutils.execSQL(span, "UPDATE sources_items " +
                " SET status = ? " +
                " WHERE id IN ( " +
                "   SELECT sources_items.id " +
                "   FROM sources_items, sources " +
                `   WHERE sources_items.id IN (${inItemsId}) ` +
                "         AND sources_items.sourceId = sources.id " +
                "         AND sources.userId = ? " +
                " )", [status, userId]);
            span.end();
        });
    }
    static getLastForSource(context, sourceId) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("SourceItemsData_getLastForSource", context);
            let sourceItem = null;
            const sourceItemRaw = yield SqlDbUtils_1.SqlDbutils.querySQL(span, "SELECT * FROM sources_items WHERE sourceId = ? ORDER BY datePublished DESC LIMIT 1", [sourceId]);
            if (sourceItemRaw.length > 0) {
                sourceItem = SourceItem_1.SourceItem.fromRaw(sourceItemRaw[0]);
            }
            span.end();
            return sourceItem;
        });
    }
    static cleanupOrphans(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("SourceItemsData_cleanupOrphans", context);
            yield SqlDbUtils_1.SqlDbutils.execSQL(span, "DELETE FROM sources_items WHERE sourceId NOT IN (SELECT id FROM sources)");
            span.end();
        });
    }
}
exports.SourceItemsData = SourceItemsData;
