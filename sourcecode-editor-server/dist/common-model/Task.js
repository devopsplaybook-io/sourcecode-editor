"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Task = void 0;
const uuid_1 = require("uuid");
class Task {
    //
    static fromJson(json) {
        if (!json) {
            return null;
        }
        const task = new Task();
        if (json.id) {
            task.id = json.id;
        }
        if (json.tag) {
            task.tag = json.tag;
        }
        if (json.outputDefinitions) {
            task.outputDefinitions = json.outputDefinitions;
        }
        task.name = json.name;
        task.script = json.script;
        task.schedule = json.schedule;
        task.webhook = json.webhook;
        return task;
    }
    constructor() {
        this.id = (0, uuid_1.v4)();
        this.outputDefinitions = [];
    }
    toJson() {
        return {
            id: this.id,
            name: this.name,
            script: this.script,
            schedule: this.schedule,
            tag: this.tag,
            outputDefinitions: this.outputDefinitions,
            webhook: this.webhook,
        };
    }
}
exports.Task = Task;
