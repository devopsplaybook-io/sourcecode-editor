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
exports.SourceLabelsDataGetSourceLabels = exports.SourceLabelsDataSetSourceLabels = exports.SourceLabelsDataListForUser = void 0;
const uuid_1 = require("uuid");
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
const SourcesData_1 = require("./SourcesData");
const SqlDbUtils_1 = require("../utils-std-ts/SqlDbUtils");
function SourceLabelsDataListForUser(context, userId) {
    var arguments_1 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_1.callee.name, context);
        const sourceLabelsRaw = yield (0, SqlDbUtils_1.SqlDbUtilsQuerySQL)(span, "SELECT sources_labels.name as labelName, " +
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
exports.SourceLabelsDataListForUser = SourceLabelsDataListForUser;
function SourceLabelsDataSetSourceLabels(context, sourceId, labels) {
    var arguments_2 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_2.callee.name, context);
        yield (0, SqlDbUtils_1.SqlDbUtilsExecSQL)(span, "DELETE FROM sources_labels WHERE sourceId = ?", [sourceId]);
        for (const label of labels) {
            yield (0, SqlDbUtils_1.SqlDbUtilsQuerySQL)(span, "INSERT INTO sources_labels (id,sourceId,name,info) VALUES (?,?,?,?)", [
                (0, uuid_1.v4)(),
                sourceId,
                label.trim(),
                JSON.stringify({}),
            ]);
        }
        const source = yield (0, SourcesData_1.SourcesDataGet)(span, sourceId);
        (0, SourcesData_1.SourcesDataInvalidateUserCache)(span, source.userId);
        span.end();
    });
}
exports.SourceLabelsDataSetSourceLabels = SourceLabelsDataSetSourceLabels;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SourceLabelsDataGetSourceLabels(context, sourceId) {
    var arguments_3 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_3.callee.name, context);
        const labelsRaw = yield (0, SqlDbUtils_1.SqlDbUtilsQuerySQL)(span, "SELECT * FROM sources_labels WHERE sourceId = ?", [sourceId]);
        const labels = [];
        for (const labelRaw of labelsRaw) {
            labelRaw.info = JSON.parse(labelRaw.info) || {};
            labels.push(labelRaw);
        }
        span.end();
        return labels;
    });
}
exports.SourceLabelsDataGetSourceLabels = SourceLabelsDataGetSourceLabels;
