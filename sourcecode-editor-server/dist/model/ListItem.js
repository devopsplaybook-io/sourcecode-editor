"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListItem = void 0;
const uuid_1 = require("uuid");
class ListItem {
    constructor() {
        this.id = (0, uuid_1.v4)();
        this.name = "_default";
        this.info = {};
    }
}
exports.ListItem = ListItem;
