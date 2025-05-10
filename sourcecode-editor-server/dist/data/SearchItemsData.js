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
exports.SearchItemsData = void 0;
const SearchItemsResult_1 = require("../model/SearchItemsResult");
const SourceItem_1 = require("../model/SourceItem");
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
const SqlDbUtils_1 = require("./SqlDbUtils");
const SourceItemStatus_1 = require("../model/SourceItemStatus");
const PAGE_SIZE = 50;
class SearchItemsData {
    //
    static listForUser(context, userId, searchOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("SearchItemsData_getForUser", context);
            const sourceItemsRaw = yield SqlDbUtils_1.SqlDbutils.querySQL(span, "SELECT sources_items.*, sources.name as sourceName " +
                "FROM sources_items, sources " +
                "WHERE sources.userId = ? " +
                getStatusFilterQuery(searchOptions) +
                "  AND sources.id = sources_items.sourceId  " +
                "ORDER BY datePublished DESC " +
                getPageQuery(searchOptions), [userId]);
            const searchItemsResult = getSearchResultsfromRaw(sourceItemsRaw);
            span.end();
            return searchItemsResult;
        });
    }
    static listForSource(context, sourceId, searchOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("SearchItemsData_getLastForSource", context);
            const sourceItemsRaw = yield SqlDbUtils_1.SqlDbutils.querySQL(span, "SELECT sources_items.*, sources.name as sourceName " +
                "FROM sources_items, sources " +
                "WHERE sources_items.sourceId = ? " +
                "  AND sources.id = ? " +
                getStatusFilterQuery(searchOptions) +
                "  AND sources.id = sources_items.sourceId " +
                "ORDER BY datePublished DESC " +
                getPageQuery(searchOptions), [sourceId, sourceId]);
            const searchItemsResult = getSearchResultsfromRaw(sourceItemsRaw);
            span.end();
            return searchItemsResult;
        });
    }
    static listItemsForLabel(context, label, userId, searchOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("SourceItemsData_listItemsForLabel", context);
            const sourceItemsRaw = yield SqlDbUtils_1.SqlDbutils.querySQL(span, "SELECT sources_items.*, sources.name AS sourceName " +
                "FROM sources_items, sources " +
                "WHERE sources_items.sourceId IN ( " +
                "    SELECT sources.id " +
                "    FROM sources, sources_labels " +
                "    WHERE sources.userId = ? AND sources_labels.sourceId = sources.id AND sources_labels.name LIKE ? " +
                "  ) " +
                getStatusFilterQuery(searchOptions) +
                "  AND sources.userId = ? " +
                "  AND sources_items.sourceId = sources.id " +
                "ORDER BY datePublished DESC " +
                getPageQuery(searchOptions), [userId, `${label}%`, userId]);
            const searchItemsResult = getSearchResultsfromRaw(sourceItemsRaw);
            span.end();
            return searchItemsResult;
        });
    }
    static listItemsForLists(context, userId, searchOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("ListsItemsData_listItemsForUser", context);
            const sourceItemsRaw = yield SqlDbUtils_1.SqlDbutils.querySQL(span, "SELECT sources_items.*, sources.name as sourceName " +
                "FROM sources_items, lists_items, sources " +
                "WHERE sources_items.id = lists_items.itemId  " +
                "  AND lists_items.userId = ? " +
                "  AND sources.id = sources_items.sourceId " +
                "  AND sources.userId = ? " +
                getStatusFilterQuery(searchOptions) +
                "ORDER BY datePublished DESC " +
                getPageQuery(searchOptions), [userId, userId]);
            const searchItemsResult = getSearchResultsfromRaw(sourceItemsRaw);
            span.end();
            return searchItemsResult;
        });
    }
}
exports.SearchItemsData = SearchItemsData;
function getPageQuery(searchOptions) {
    return `LIMIT ${PAGE_SIZE + 1} OFFSET ${(searchOptions.page - 1) * PAGE_SIZE}`;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSearchResultsfromRaw(sourceItemsRaw) {
    const searchItemsResult = new SearchItemsResult_1.SearchItemsResult();
    for (const sourceItem of sourceItemsRaw) {
        searchItemsResult.sourceItems.push(SourceItem_1.SourceItem.fromRaw(sourceItem));
    }
    if (searchItemsResult.sourceItems.length > PAGE_SIZE) {
        searchItemsResult.sourceItems.pop();
        searchItemsResult.pageHasMore = true;
    }
    return searchItemsResult;
}
function getStatusFilterQuery(searchOptions) {
    if (searchOptions.filterStatus === SourceItemStatus_1.SourceItemStatus.unread) {
        return "  AND sources_items.status = 'unread' ";
    }
    return "";
}
