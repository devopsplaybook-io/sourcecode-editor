"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeoutWait = void 0;
function TimeoutWait(duration) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, duration);
    });
}
exports.TimeoutWait = TimeoutWait;
