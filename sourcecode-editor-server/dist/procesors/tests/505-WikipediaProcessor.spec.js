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
const Source_1 = require("../../model/Source");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const processor = require("../../processors-system/505-WikipediaProcessor");
describe("Wikipedia processor: Test URL", () => {
    //
    test("URL: Normal", () => __awaiter(void 0, void 0, void 0, function* () {
        const source = new Source_1.Source();
        source.info.url = "https://en.wikipedia.org/wiki/Earth";
        const testResult = yield processor.test(source);
        expect(testResult.name).toBeDefined();
        expect(testResult.icon).toBeDefined();
    }));
    test("URL: Mobile", () => __awaiter(void 0, void 0, void 0, function* () {
        const source = new Source_1.Source();
        source.info.url = "https://en.m.wikipedia.org/wiki/Earth";
        const testResult = yield processor.test(source);
        expect(testResult.name).toBeDefined();
        expect(testResult.icon).toBeDefined();
    }));
    test("URL: Root URL", () => __awaiter(void 0, void 0, void 0, function* () {
        const source = new Source_1.Source();
        source.info.url = "https://en.wikipedia.org/";
        const testResult = yield processor.test(source);
        expect(testResult).toBeNull();
    }));
    test("URL: Invalid URL", () => __awaiter(void 0, void 0, void 0, function* () {
        const source = new Source_1.Source();
        source.info.url = "https://hellowikipedia.org/";
        const testResult = yield processor.test(source);
        expect(testResult).toBeNull();
    }));
});
describe("Wikipedia processor: Get Items", () => {
    //
    test("Page: Earth", () => __awaiter(void 0, void 0, void 0, function* () {
        const source = new Source_1.Source();
        source.info.url = "https://en.wikipedia.org/wiki/Earth";
        const sourceItems = yield processor.fetchLatest(source, null);
        expect(sourceItems.length).toBeGreaterThan(0);
    }));
});
