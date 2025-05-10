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
exports.ListsItemsDataGetItemForUser = exports.ListsItemsDataDeleteForUser = exports.ListsItemsDataAdd = void 0;
const SourceItem_1 = require("../model/SourceItem");
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
const SourcesData_1 = require("./SourcesData");
const SqlDbUtils_1 = require("../utils-std-ts/SqlDbUtils");
function ListsItemsDataAdd(context, listItem) {
    var arguments_1 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_1.callee.name, context);
        yield (0, SqlDbUtils_1.SqlDbUtilsExecSQL)(span, "INSERT INTO lists_items (id, itemId, userId, name, info) VALUES (?, ?, ?, ?, ?)", [
            listItem.id,
            listItem.itemId,
            listItem.userId,
            listItem.name,
            JSON.stringify(listItem.info),
        ]);
        (0, SourcesData_1.SourcesDataInvalidateUserCache)(span, listItem.userId);
        span.end();
    });
}
exports.ListsItemsDataAdd = ListsItemsDataAdd;
function ListsItemsDataDeleteForUser(context, itemId, userId) {
    var arguments_2 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_2.callee.name, context);
        yield (0, SqlDbUtils_1.SqlDbUtilsExecSQL)(span, "DELETE FROM lists_items WHERE itemId = ? AND userId = ?", [itemId, userId]);
        (0, SourcesData_1.SourcesDataInvalidateUserCache)(span, userId);
        span.end();
    });
}
exports.ListsItemsDataDeleteForUser = ListsItemsDataDeleteForUser;
function ListsItemsDataGetItemForUser(context, itemId, userId) {
    var arguments_3 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_3.callee.name, context);
        const sourceItemRaw = yield (0, SqlDbUtils_1.SqlDbUtilsQuerySQL)(span, "SELECT sources_items.* " +
            "FROM sources_items, lists_items " +
            "WHERE sources_items.id = ? " +
            "  AND lists_items.itemId = ? " +
            "  AND lists_items.userId = ? " +
            "ORDER BY datePublished DESC", [itemId, itemId, userId]);
        let sourceItem = null;
        if (sourceItemRaw.length > 0) {
            sourceItem = SourceItem_1.SourceItem.fromRaw(sourceItemRaw[0]);
        }
        span.end();
        return sourceItem;
    });
}
exports.ListsItemsDataGetItemForUser = ListsItemsDataGetItemForUser;
