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
const Source_1 = require("../model/Source");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const processor = require("../../processors-system/601-YahooFinanceProcessor");
describe("YahooFinance processor: Test URL", () => {
    //
    test("URL: Normal", () => __awaiter(void 0, void 0, void 0, function* () {
        const source = new Source_1.Source();
        source.info.url = "https://finance.yahoo.com/quote/9988.HK";
        const testResult = yield processor.test(source);
        expect(testResult.name).toBeDefined();
        expect(testResult.icon).toBeDefined();
    }));
    test("URL: With Parameters", () => __awaiter(void 0, void 0, void 0, function* () {
        const source = new Source_1.Source();
        source.info.url = "https://finance.yahoo.com/quote/9988.HK?p=9988.HK&.tsrc=fin-srch";
        const testResult = yield processor.test(source);
        expect(testResult.name).toBeDefined();
        expect(testResult.icon).toBeDefined();
    }));
    test("URL: Root URL", () => __awaiter(void 0, void 0, void 0, function* () {
        const source = new Source_1.Source();
        source.info.url = "https://finance.yahoo.com/quote/";
        const testResult = yield processor.test(source);
        expect(testResult).toBeNull();
    }));
    test("URL: Invalid URL", () => __awaiter(void 0, void 0, void 0, function* () {
        const source = new Source_1.Source();
        source.info.url = "https://awrongurl.con/";
        const testResult = yield processor.test(source);
        expect(testResult).toBeNull();
    }));
});
describe("YahooFinance processor: Get Items", () => {
    //
    test.only("First Fetch", () => __awaiter(void 0, void 0, void 0, function* () {
        const source = new Source_1.Source();
        source.info.url = "https://finance.yahoo.com/quote/9988.HK";
        const sourceItems = yield processor.fetchLatest(source, null);
        expect(sourceItems.length).toEqual(1);
    }));
    test.only("Second Fetch Before 24 hours", () => __awaiter(void 0, void 0, void 0, function* () {
        const source = new Source_1.Source();
        source.info.url = "https://finance.yahoo.com/quote/9988.HK";
        let sourceItems = yield processor.fetchLatest(source, null);
        sourceItems = yield processor.fetchLatest(source, sourceItems[0]);
        expect(sourceItems.length).toEqual(0);
    }));
    test.only("Second Fetch After 24 hours", () => __awaiter(void 0, void 0, void 0, function* () {
        const source = new Source_1.Source();
        source.info.url = "https://finance.yahoo.com/quote/9988.HK";
        let sourceItems = yield processor.fetchLatest(source, null);
        sourceItems[0].datePublished = new Date(new Date().getTime() - 25 * 60 * 60 * 1000);
        sourceItems = yield processor.fetchLatest(source, sourceItems[0]);
        expect(sourceItems.length).toEqual(1);
    }));
});
