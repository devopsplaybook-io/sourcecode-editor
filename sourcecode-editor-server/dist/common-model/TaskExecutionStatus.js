"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskExecutionStatus = void 0;
var TaskExecutionStatus;
(function (TaskExecutionStatus) {
    TaskExecutionStatus["queued"] = "queued";
    TaskExecutionStatus["executing"] = "executing";
    TaskExecutionStatus["executed"] = "executed";
    TaskExecutionStatus["cancelled"] = "cancelled";
    TaskExecutionStatus["cancelling"] = "cancelling";
    TaskExecutionStatus["failed"] = "failed";
})(TaskExecutionStatus = exports.TaskExecutionStatus || (exports.TaskExecutionStatus = {}));
