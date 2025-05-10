"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Source = void 0;
const uuid_1 = require("uuid");
class Source {
    constructor() {
        this.id = (0, uuid_1.v4)();
        this.info = {};
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toJson() {
        return {
            id: this.id,
            name: this.name,
            info: this.info,
            userId: this.userId,
            labels: this.labels,
        };
    }
}
exports.Source = Source;
