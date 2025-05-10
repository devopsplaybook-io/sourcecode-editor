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
exports.SchedulerInit = void 0;
const StandardTracer_1 = require("./utils-std-ts/StandardTracer");
const Timeout_1 = require("./utils-std-ts/Timeout");
const RulesData_1 = require("./rules/RulesData");
const Processors_1 = require("./procesors/Processors");
const SourcesData_1 = require("./sources/SourcesData");
const RulesExecution_1 = require("./rules/RulesExecution");
const SourceItemsData_1 = require("./sources/SourceItemsData");
let config;
function SchedulerInit(context, configIn) {
    var arguments_1 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_1.callee.name, context);
        config = configIn;
        SchedulerStartSchedule();
        span.end();
    });
}
exports.SchedulerInit = SchedulerInit;
// Private Functions
function SchedulerStartSchedule() {
    var arguments_2 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_2.callee.name);
            const sources = yield (0, SourcesData_1.SourcesDataListAll)(span);
            for (const source of sources) {
                if (!source.info.dateFetched ||
                    new Date().getTime() - new Date(source.info.dateFetched).getTime() > config.SOURCE_FETCH_FREQUENCY) {
                    yield (0, Processors_1.ProcessorsFetchSourceItems)(span, source);
                }
            }
            for (const userRules of yield (0, RulesData_1.RulesDataListAll)(span)) {
                yield (0, RulesExecution_1.RulesExecutionExecuteUserRules)(span, userRules);
            }
            yield (0, SourceItemsData_1.SourceItemsDataCleanupOrphans)(span);
            span.end();
            yield (0, Timeout_1.TimeoutWait)(config.SOURCE_FETCH_FREQUENCY / 4);
        }
    });
}
