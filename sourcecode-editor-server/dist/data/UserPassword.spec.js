"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = require("../model/User");
const UserPassword_1 = require("./UserPassword");
test("Password should be successfully verified if it's the same", () => __awaiter(void 0, void 0, void 0, function* () {
    const password = "testPassword1234";
    const user = new User_1.User();
    yield UserPassword_1.UserPassword.setPassword(null, user, password);
    expect(yield UserPassword_1.UserPassword.checkPassword(null, user, password)).toBeTruthy();
}));
test("Password should be faile to be verified if it's not the same", () => __awaiter(void 0, void 0, void 0, function* () {
    const password = "testPassword1234";
    const passwordWrong = "testPassword12345";
    const user = new User_1.User();
    yield UserPassword_1.UserPassword.setPassword(null, user, password);
    expect(yield UserPassword_1.UserPassword.checkPassword(null, user, passwordWrong)).toBeFalsy();
}));
