"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const uuid_1 = require("uuid");
class User {
    //
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static fromJson(json) {
        if (!json) {
            return null;
        }
        const user = new User();
        if (json.id) {
            user.id = json.id;
        }
        user.id = json.id;
        user.name = json.name;
        user.passwordEncrypted = json.passwordEncrypted;
        return user;
    }
    constructor() {
        this.id = (0, uuid_1.v4)();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toJson() {
        return {
            id: this.id,
            name: this.name,
            passwordEncrypted: this.passwordEncrypted,
        };
    }
}
exports.User = User;
