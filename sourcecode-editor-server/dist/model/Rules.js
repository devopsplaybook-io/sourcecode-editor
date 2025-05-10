"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rules = void 0;
const uuid_1 = require("uuid");
class Rules {
    //
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static fromJson(json) {
        if (!json) {
            return null;
        }
        const rules = new Rules();
        if (json.id) {
            rules.id = json.id;
        }
        rules.id = json.id;
        if (typeof json.info === "string") {
            rules.info = JSON.parse(json.info);
        }
        else {
            rules.info = json.info;
        }
        return rules;
    }
    constructor() {
        this.id = (0, uuid_1.v4)();
        this.info = [];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toJson() {
        return {
            id: this.id,
            userId: this.userId,
            info: this.info,
        };
    }
}
exports.Rules = Rules;
