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
exports.Scheduler = void 0;
const StandardTracer_1 = require("./utils-std-ts/StandardTracer");
const Timeout_1 = require("./utils-std-ts/Timeout");
const processors_1 = require("./procesors/processors");
const SourcesData_1 = require("./data/SourcesData");
const SourceItemsData_1 = require("./data/SourceItemsData");
let config;
class Scheduler {
    //
    static init(context, configIn) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("Scheduler_init", context);
            config = configIn;
            Scheduler.startSchedule();
            span.end();
        });
    }
    static startSchedule() {
        return __awaiter(this, void 0, void 0, function* () {
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const span = StandardTracer_1.StandardTracer.startSpan("Scheduler_start");
                const sources = yield SourcesData_1.SourcesData.listAll(span);
                for (const source of sources) {
                    if (!source.info.dateFetched ||
                        new Date().getTime() - new Date(source.info.dateFetched).getTime() > config.SOURCE_FETCH_FREQUENCY) {
                        yield processors_1.Processors.fetchSourceItems(span, source);
                    }
                }
                yield SourceItemsData_1.SourceItemsData.cleanupOrphans(span);
                span.end();
                yield Timeout_1.Timeout.wait(config.SOURCE_FETCH_FREQUENCY / 4);
            }
        });
    }
}
exports.Scheduler = Scheduler;
