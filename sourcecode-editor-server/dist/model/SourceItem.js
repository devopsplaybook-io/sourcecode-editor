"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourceItem = void 0;
const uuid_1 = require("uuid");
class SourceItem {
    constructor() {
        this.id = (0, uuid_1.v4)();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static fromRaw(itemRaw) {
        const sourceItem = new SourceItem();
        sourceItem.id = itemRaw.id;
        sourceItem.sourceId = itemRaw.sourceId;
        sourceItem.sourceName = itemRaw.sourceName;
        sourceItem.title = itemRaw.title;
        sourceItem.content = itemRaw.content;
        sourceItem.url = itemRaw.url;
        sourceItem.status = itemRaw.status;
        sourceItem.datePublished = new Date(itemRaw.datePublished);
        sourceItem.info = JSON.parse(itemRaw.info);
        return sourceItem;
    }
}
exports.SourceItem = SourceItem;
