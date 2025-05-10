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
exports.ListsItemsData = void 0;
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
const SqlDbUtils_1 = require("./SqlDbUtils");
const SourceItem_1 = require("../model/SourceItem");
class ListsItemsData {
    //
    static add(context, listItem) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("ListsItemsData_add", context);
            yield SqlDbUtils_1.SqlDbutils.execSQL(span, "INSERT INTO lists_items (id, itemId, userId, name, info) VALUES (?, ?, ?, ?, ?)", [
                listItem.id,
                listItem.itemId,
                listItem.userId,
                listItem.name,
                JSON.stringify(listItem.info),
            ]);
            span.end();
        });
    }
    static deleteForUser(context, itemId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("ListsItemsData_deleteForUser", context);
            yield SqlDbUtils_1.SqlDbutils.execSQL(span, "DELETE FROM lists_items WHERE itemId = ? AND userId = ?", [itemId, userId]);
            span.end();
        });
    }
    static getItemForUser(context, itemId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("ListsItemsData_getItemForUser", context);
            const sourceItemRaw = yield SqlDbUtils_1.SqlDbutils.querySQL(span, "SELECT sources_items.* " +
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
}
exports.ListsItemsData = ListsItemsData;
