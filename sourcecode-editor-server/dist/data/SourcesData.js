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
exports.SourcesData = void 0;
const Source_1 = require("../model/Source");
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
const SqlDbUtils_1 = require("./SqlDbUtils");
class SourcesData {
    //
    static get(context, sourceId) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("SourcesData_get", context);
            const sourceRaw = yield SqlDbUtils_1.SqlDbutils.querySQL(span, "SELECT * FROM sources WHERE id = ?", [sourceId]);
            let source = null;
            if (sourceRaw.length > 0) {
                source = SourcesData.fromRaw(sourceRaw[0]);
            }
            span.end();
            return source;
        });
    }
    static listForUser(context, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("SourcesData_listForUser", context);
            const sourcesRaw = yield SqlDbUtils_1.SqlDbutils.querySQL(span, `SELECT * FROM sources WHERE userId = '${userId}'`);
            const sources = [];
            for (const sourceRaw of sourcesRaw) {
                sources.push(SourcesData.fromRaw(sourceRaw));
            }
            span.end();
            return sources;
        });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static listCountsForUser(context, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("SourcesData_listCountsForUser", context);
            const countsRaw = yield SqlDbUtils_1.SqlDbutils.querySQL(span, "SELECT COUNT(id) as unreadCount, sourceId FROM sources_items " +
                "WHERE sourceId IN (" +
                "    SELECT id FROM sources " +
                "    WHERE userId = ? " +
                "  ) " +
                "  AND status = ? " +
                "GROUP BY sourceId ", [userId, "unread"]);
            span.end();
            return countsRaw;
        });
    }
    static listAll(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("SourcesData_listAll", context);
            const sourcesRaw = yield SqlDbUtils_1.SqlDbutils.querySQL(span, `SELECT * FROM sources`);
            const sources = [];
            for (const sourceRaw of sourcesRaw) {
                sources.push(SourcesData.fromRaw(sourceRaw));
            }
            span.end();
            return sources;
        });
    }
    static add(context, source) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("SourcesData_add", context);
            yield SqlDbUtils_1.SqlDbutils.querySQL(span, "INSERT INTO sources (id,userId,name,info) VALUES (?,?,?,?)", [
                source.id,
                source.userId,
                source.name,
                JSON.stringify(source.info),
            ]);
            span.end();
        });
    }
    static update(context, source) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("SourcesData_update", context);
            yield SqlDbUtils_1.SqlDbutils.execSQL(span, "UPDATE sources SET name = ?, info = ? WHERE id = ?", [
                source.name,
                JSON.stringify(source.info),
                source.id,
            ]);
            span.end();
        });
    }
    static delete(context, sourceId) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("SourcesData_delete", context);
            yield SqlDbUtils_1.SqlDbutils.execSQL(span, "DELETE FROM sources WHERE id = ?", [sourceId]);
            yield SqlDbUtils_1.SqlDbutils.execSQL(span, "DELETE FROM sources_items WHERE sourceId = ?", [sourceId]);
            yield SqlDbUtils_1.SqlDbutils.execSQL(span, "DELETE FROM sources_labels WHERE sourceId = ?", [sourceId]);
            span.end();
        });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static fromRaw(sourceRaw) {
        const source = new Source_1.Source();
        source.id = sourceRaw.id;
        source.userId = sourceRaw.userId;
        source.name = sourceRaw.name;
        source.info = JSON.parse(sourceRaw.info);
        return source;
    }
}
exports.SourcesData = SourcesData;
