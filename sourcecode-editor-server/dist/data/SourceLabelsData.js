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
exports.SourceLabelsData = void 0;
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
const SqlDbUtils_1 = require("./SqlDbUtils");
const uuid_1 = require("uuid");
class SourceLabelsData {
    //
    static listForUser(context, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("SourceLabelsData_listForUser", context);
            const sourceLabelsRaw = yield SqlDbUtils_1.SqlDbutils.querySQL(span, "SELECT sources_labels.name as labelName, " +
                "  sources.name as sourceName, " +
                "  sources.id as sourceId, " +
                "  sources.info as sourceInfo " +
                "FROM sources " +
                "  LEFT JOIN sources_labels ON sources_labels.sourceId = sources.id " +
                "WHERE sources.userId = ?", [userId]);
            const sourcesLabels = [];
            for (const sourceLabelRaw of sourceLabelsRaw) {
                sourceLabelRaw.sourceInfo = JSON.parse(sourceLabelRaw.sourceInfo) || {};
                sourcesLabels.push(sourceLabelRaw);
            }
            span.end();
            return sourcesLabels;
        });
    }
    static setSourceLabels(context, sourceId, labels) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("SourceLabelsData_setSourceLabels", context);
            yield SqlDbUtils_1.SqlDbutils.execSQL(span, "DELETE FROM sources_labels WHERE sourceId = ?", [sourceId]);
            for (const label of labels) {
                yield SqlDbUtils_1.SqlDbutils.querySQL(span, "INSERT INTO sources_labels (id,sourceId,name,info) VALUES (?,?,?,?)", [
                    (0, uuid_1.v4)(),
                    sourceId,
                    label.trim(),
                    JSON.stringify({}),
                ]);
            }
            span.end();
        });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static getSourceLabels(context, sourceId) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("SourceLabelsData_getSourceLabels", context);
            const labelsRaw = yield SqlDbUtils_1.SqlDbutils.querySQL(span, "SELECT * FROM sources_labels WHERE sourceId = ?", [sourceId]);
            const labels = [];
            for (const labelRaw of labelsRaw) {
                labelRaw.info = JSON.parse(labelRaw.info) || {};
                labels.push(labelRaw);
            }
            span.end();
            return labels;
        });
    }
}
exports.SourceLabelsData = SourceLabelsData;
