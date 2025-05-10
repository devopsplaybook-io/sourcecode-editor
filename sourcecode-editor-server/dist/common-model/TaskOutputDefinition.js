"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskOutputDefinition = void 0;
const uuid_1 = require("uuid");
class TaskOutputDefinition {
    constructor() {
        this.id = (0, uuid_1.v4)();
    }
}
exports.TaskOutputDefinition = TaskOutputDefinition;
