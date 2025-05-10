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
exports.ItemsRoutes = void 0;
const Auth_1 = require("../data/Auth");
const SearchItemsData_1 = require("../data/SearchItemsData");
const SourceItemsData_1 = require("../data/SourceItemsData");
const SourcesData_1 = require("../data/SourcesData");
const SearchItemsOptions_1 = require("../model/SearchItemsOptions");
const SourceItemStatus_1 = require("../model/SourceItemStatus");
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
class ItemsRoutes {
    //
    getRoutes(fastify) {
        return __awaiter(this, void 0, void 0, function* () {
            fastify.post("/search", (req, res) => __awaiter(this, void 0, void 0, function* () {
                const userSession = yield Auth_1.Auth.getUserSession(req);
                if (!userSession.isAuthenticated) {
                    return res.status(403).send({ error: "Access Denied" });
                    //
                }
                if (req.body.searchCriteria === "labelName" && !req.body.labelName) {
                    return res.status(400).send({ error: "Missing Parameter: labelName" });
                }
                if (req.body.searchCriteria === "sourceId" && !req.body.sourceId) {
                    return res.status(400).send({ error: "Missing Parameter: sourceId" });
                }
                const searchOptions = new SearchItemsOptions_1.SearchItemsOptions();
                searchOptions.page = req.body.page || 1;
                searchOptions.filterStatus = req.body.filterStatus || SourceItemStatus_1.SourceItemStatus.unread;
                if (req.body.searchCriteria === "labelName") {
                    const searchItemsResult = yield SearchItemsData_1.SearchItemsData.listItemsForLabel(StandardTracer_1.StandardTracer.getSpanFromRequest(req), req.body.labelName, userSession.userId, searchOptions);
                    return res.status(200).send(searchItemsResult);
                }
                if (req.body.searchCriteria === "sourceId") {
                    const source = yield SourcesData_1.SourcesData.get(StandardTracer_1.StandardTracer.getSpanFromRequest(req), req.body.sourceId);
                    if (source.userId !== userSession.userId) {
                        return res.status(403).send({ error: "Access Denied" });
                    }
                    const searchItemsResult = yield SearchItemsData_1.SearchItemsData.listForSource(StandardTracer_1.StandardTracer.getSpanFromRequest(req), source.id, searchOptions);
                    return res.status(200).send(searchItemsResult);
                }
                if (req.body.searchCriteria === "all") {
                    const searchItemsResult = yield SearchItemsData_1.SearchItemsData.listForUser(StandardTracer_1.StandardTracer.getSpanFromRequest(req), userSession.userId, searchOptions);
                    return res.status(200).send(searchItemsResult);
                }
                if (req.body.searchCriteria === "lists") {
                    const searchItemsResult = yield SearchItemsData_1.SearchItemsData.listItemsForLists(StandardTracer_1.StandardTracer.getSpanFromRequest(req), userSession.userId, searchOptions);
                    return res.status(200).send(searchItemsResult);
                }
                return res.status(400).send({ error: "Search Criteria Missing or Unknown" });
            }));
            fastify.put("/status", (req, res) => __awaiter(this, void 0, void 0, function* () {
                const userSession = yield Auth_1.Auth.getUserSession(req);
                if (!userSession.isAuthenticated) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                if (!req.body.status ||
                    (req.body.status !== SourceItemStatus_1.SourceItemStatus.read && req.body.status !== SourceItemStatus_1.SourceItemStatus.unread)) {
                    return res.status(400).send({ error: "Wrong status parameter" });
                }
                yield SourceItemsData_1.SourceItemsData.updateMultipleStatusForUser(StandardTracer_1.StandardTracer.getSpanFromRequest(req), req.body.itemIds, req.body.status, userSession.userId);
                return res.status(201).send({});
            }));
        });
    }
}
exports.ItemsRoutes = ItemsRoutes;
