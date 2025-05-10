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
exports.ListsItemsRoutes = void 0;
const Auth_1 = require("../data/Auth");
const ListsItemsData_1 = require("../data/ListsItemsData");
const ListItem_1 = require("../model/ListItem");
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
class ListsItemsRoutes {
    //
    getRoutes(fastify) {
        return __awaiter(this, void 0, void 0, function* () {
            fastify.get("/items/:itemId", (req, res) => __awaiter(this, void 0, void 0, function* () {
                const userSession = yield Auth_1.Auth.getUserSession(req);
                if (!userSession.isAuthenticated) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                const sourceItem = yield ListsItemsData_1.ListsItemsData.getItemForUser(StandardTracer_1.StandardTracer.getSpanFromRequest(req), req.params.itemId, userSession.userId);
                return res.status(201).send(sourceItem || {});
            }));
            fastify.put("/items", (req, res) => __awaiter(this, void 0, void 0, function* () {
                const userSession = yield Auth_1.Auth.getUserSession(req);
                if (!userSession.isAuthenticated) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                if (!req.body.itemId) {
                    return res.status(400).send({ error: "Missing Parameter: itemId" });
                }
                const listItem = new ListItem_1.ListItem();
                listItem.itemId = req.body.itemId;
                listItem.userId = userSession.userId;
                if (req.body.listName) {
                    listItem.itemId = req.body.itemId;
                }
                listItem.info.dateAdded = new Date();
                ListsItemsData_1.ListsItemsData.add(StandardTracer_1.StandardTracer.getSpanFromRequest(req), listItem);
                return res.status(201).send({});
            }));
            fastify.delete("/items/:itemId", (req, res) => __awaiter(this, void 0, void 0, function* () {
                const userSession = yield Auth_1.Auth.getUserSession(req);
                if (!userSession.isAuthenticated) {
                    return res.status(403).send({ error: "Access Denied" });
                }
                ListsItemsData_1.ListsItemsData.deleteForUser(StandardTracer_1.StandardTracer.getSpanFromRequest(req), req.params.itemId, userSession.userId);
                return res.status(202).send({});
            }));
        });
    }
}
exports.ListsItemsRoutes = ListsItemsRoutes;
