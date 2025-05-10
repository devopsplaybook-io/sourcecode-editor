"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskExecution = void 0;
const uuid_1 = require("uuid");
class TaskExecution {
    //
    static fromJson(json) {
        if (!json) {
            return null;
        }
        const taskExecution = new TaskExecution();
        if (json.id) {
            taskExecution.id = json.id;
        }
        if (json.tag) {
            taskExecution.tag = json.tag;
        }
        if (json.outputs) {
            taskExecution.outputs = json.outputs;
        }
        taskExecution.taskId = json.taskId;
        taskExecution.script = json.script;
        taskExecution.status = json.status;
        taskExecution.success = json.success;
        taskExecution.agentId = json.agentId;
        taskExecution.dateQueued = json.dateQueued;
        taskExecution.dateExecuting = json.dateExecuting;
        taskExecution.dateExecuted = json.dateExecuted;
        taskExecution.dateAgentAlive = json.dateAgentAlive;
        return taskExecution;
    }
    constructor() {
        this.version = 2;
        this.success = false;
        this.id = (0, uuid_1.v4)();
        this.outputs = [];
    }
    toJson() {
        return {
            id: this.id,
            taskId: this.taskId,
            script: this.script,
            status: this.status,
            success: this.success,
            agentId: this.agentId,
            tag: this.tag,
            dateQueued: this.dateQueued,
            dateExecuting: this.dateExecuting,
            dateExecuted: this.dateExecuted,
            dateAgentAlive: this.dateAgentAlive,
            outputs: this.outputs,
        };
    }
}
exports.TaskExecution = TaskExecution;
