"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const DEV_MODE = (() => {
    if (process.env.NODE_ENV === "dev") {
        return true;
    }
    return false;
})();
class Logger {
    constructor(module) {
        this.module = `${module}`;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    debug(message) {
        if (DEV_MODE) {
            this.display("debug", message);
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    info(message) {
        this.display("info", message);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    warn(message) {
        this.display("warn", message);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error(message) {
        this.display("error", message);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    display(level, message) {
        if (typeof message === "string") {
            // eslint:disable-next-line:no-console
            console.log(`[${level}] [${this.module}] ${message}`);
        }
        else if (message instanceof Error) {
            // eslint:disable-next-line:no-console
            console.log(`${level} [${this.module}] ${message}`);
            // eslint:disable-next-line:no-console
            console.log(message.stack);
        }
        else if (typeof message === "object") {
            // eslint:disable-next-line:no-console
            console.log(`${level} [${this.module}] ${JSON.stringify(message)}`);
        }
    }
}
exports.Logger = Logger;
