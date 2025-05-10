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
exports.SearchItemsDataListItemsForLabel = exports.SearchItemsDataListForSource = exports.SearchItemsDataListForUser = void 0;
const SearchItemsResult_1 = require("../model/SearchItemsResult");
const SourceItem_1 = require("../model/SourceItem");
const SourceItemStatus_1 = require("../model/SourceItemStatus");
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
const SqlDbUtils_1 = require("../utils-std-ts/SqlDbUtils");
const PAGE_SIZE = 50;
function SearchItemsDataListForUser(context, userId, searchOptions) {
    var arguments_1 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_1.callee.name, context);
        const sourceItemsRaw = yield (0, SqlDbUtils_1.SqlDbUtilsQuerySQL)(span, "SELECT sources_items.*, sources.name as sourceName " +
            "FROM sources_items " +
            "JOIN sources ON sources_items.sourceId = sources.id " +
            getSavedFromQuery(searchOptions) +
            "WHERE sources.userId = ? " +
            getStatusFilterQuery(searchOptions) +
            "ORDER BY datePublished DESC " +
            getPageQuery(searchOptions), [userId]);
        const searchItemsResult = getSearchResultsfromRaw(sourceItemsRaw);
        span.end();
        return searchItemsResult;
    });
}
exports.SearchItemsDataListForUser = SearchItemsDataListForUser;
function SearchItemsDataListForSource(context, sourceId, searchOptions) {
    var arguments_2 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_2.callee.name, context);
        const sourceItemsRaw = yield (0, SqlDbUtils_1.SqlDbUtilsQuerySQL)(span, "SELECT sources_items.*, sources.name as sourceName " +
            "FROM sources_items " +
            "JOIN sources ON sources_items.sourceId = sources.id " +
            getSavedFromQuery(searchOptions) +
            "WHERE sources_items.sourceId = ? " +
            "  AND sources.id = ? " +
            getAgeFilterQuery(searchOptions) +
            getStatusFilterQuery(searchOptions) +
            "ORDER BY datePublished DESC " +
            getPageQuery(searchOptions), [sourceId, sourceId]);
        const searchItemsResult = getSearchResultsfromRaw(sourceItemsRaw);
        span.end();
        return searchItemsResult;
    });
}
exports.SearchItemsDataListForSource = SearchItemsDataListForSource;
function SearchItemsDataListItemsForLabel(context, label, userId, searchOptions) {
    var arguments_3 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_3.callee.name, context);
        const sourceItemsRaw = yield (0, SqlDbUtils_1.SqlDbUtilsQuerySQL)(span, "SELECT sources_items.*, sources.name AS sourceName " +
            "FROM sources_items " +
            "JOIN sources ON sources_items.sourceId = sources.id " +
            getSavedFromQuery(searchOptions) +
            "WHERE sources_items.sourceId IN ( " +
            "    SELECT sources.id " +
            "    FROM sources, sources_labels " +
            "    WHERE sources.userId = ? " +
            "          AND sources_labels.sourceId = sources.id AND sources_labels.name LIKE ? " +
            "  ) " +
            getStatusFilterQuery(searchOptions) +
            getAgeFilterQuery(searchOptions) +
            "  AND sources.userId = ? " +
            "ORDER BY datePublished DESC " +
            getPageQuery(searchOptions), [userId, `${label}%`, userId]);
        const searchItemsResult = getSearchResultsfromRaw(sourceItemsRaw);
        span.end();
        return searchItemsResult;
    });
}
exports.SearchItemsDataListItemsForLabel = SearchItemsDataListItemsForLabel;
// Private Functions
function getPageQuery(searchOptions) {
    if (searchOptions.page < 0) {
        return "";
    }
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
function getAgeFilterQuery(searchOptions) {
    if (searchOptions.maxDate) {
        return `  AND sources_items.datePublished <= '${searchOptions.maxDate.toISOString()}' `;
    }
    return "";
}
function getSavedFromQuery(searchOptions) {
    if (searchOptions.isSaved) {
        return " JOIN lists_items ON sources_items.id = lists_items.itemId ";
    }
    return "";
}
