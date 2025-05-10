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
exports.ProcessorsGetUserProcessorInfo = exports.ProcessorsFetchSourceItems = exports.ProcessorsFetchSourceItemsForUser = exports.ProcessorsCheckSource = exports.ProcessorsGetInfos = exports.ProcessorsInit = void 0;
const SourceItemStatus_1 = require("../model/SourceItemStatus");
const Logger_1 = require("../utils-std-ts/Logger");
const fs = require("fs-extra");
const path = require("path");
const lodash_1 = require("lodash");
const uuid_1 = require("uuid");
const UserProcessorInfoStatus_1 = require("../model/UserProcessorInfoStatus");
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
const SourcesData_1 = require("../sources/SourcesData");
const SourceItemsData_1 = require("../sources/SourceItemsData");
const logger = new Logger_1.Logger("Processor");
let config;
let processorsFiles = [];
const userProcessorInfoStatus = [];
const fetchSourceItemsQueue = [];
function ProcessorsInit(context, configIn) {
    var arguments_1 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_1.callee.name, context);
        config = configIn;
        for (const processorsFile of yield fs.readdir(config.PROCESSORS_USER)) {
            if (path.extname(processorsFile) === ".js") {
                processorsFiles.push({
                    name: processorsFile,
                    path: `${path.resolve(config.PROCESSORS_USER)}/${processorsFile}`,
                });
            }
        }
        for (const processorsFile of yield fs.readdir(config.PROCESSORS_SYSTEM)) {
            if (path.extname(processorsFile) === ".js") {
                processorsFiles.push({
                    name: processorsFile,
                    path: `${path.resolve(config.PROCESSORS_SYSTEM)}/${processorsFile}`,
                });
            }
        }
        processorsFiles = (0, lodash_1.sortBy)(processorsFiles, ["name"]);
        logger.info(`Found ${processorsFiles.length} processors`);
        span.end();
    });
}
exports.ProcessorsInit = ProcessorsInit;
function ProcessorsGetInfos(context) {
    var arguments_2 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_2.callee.name, context);
        const processorInfos = [];
        for (const processorsFile of processorsFiles) {
            try {
                const processor = yield Promise.resolve(`${processorsFile.path}`).then(s => require(s));
                processorInfos.push(processor.getInfo());
            }
            catch (err) {
                // Nothing
            }
        }
        span.end();
        return processorInfos;
    });
}
exports.ProcessorsGetInfos = ProcessorsGetInfos;
function ProcessorsCheckSource(context, source) {
    var arguments_3 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_3.callee.name, context);
        if (!source.info.processorPath) {
            userProcessorInfoStatusStart(span, source.userId);
            let processed = false;
            for (const processorsFile of processorsFiles) {
                if (!processed) {
                    try {
                        const processor = yield Promise.resolve(`${processorsFile.path}`).then(s => require(s));
                        const sourceInfo = yield processor.test(source);
                        if (sourceInfo) {
                            sourceInfo.processorPath = processorsFile.path;
                            source.name = sourceInfo.name;
                            if (!source.info) {
                                source.info = {};
                            }
                            source.info = (0, lodash_1.merge)(source.info, sourceInfo);
                            yield (0, SourcesData_1.SourcesDataUpdate)(span, source);
                            processed = true;
                        }
                    }
                    catch (err) {
                        // Nothing to do
                        // logger.error(err);
                    }
                }
                userProcessorInfoStatusStop(span, source.userId);
            }
        }
        span.end();
    });
}
exports.ProcessorsCheckSource = ProcessorsCheckSource;
function ProcessorsFetchSourceItemsForUser(context, userId) {
    var arguments_4 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_4.callee.name, context);
        const sources = yield (0, SourcesData_1.SourcesDataListForUser)(span, userId);
        for (const source of sources) {
            yield ProcessorsFetchSourceItems(span, source);
        }
        span.end();
    });
}
exports.ProcessorsFetchSourceItemsForUser = ProcessorsFetchSourceItemsForUser;
function ProcessorsFetchSourceItems(context, source) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(0, lodash_1.find)(fetchSourceItemsQueue, { id: source.id })) {
            fetchSourceItemsQueue.push(source);
            if (fetchSourceItemsQueue.length === 1) {
                fetchSourceItemsQueued();
            }
        }
    });
}
exports.ProcessorsFetchSourceItems = ProcessorsFetchSourceItems;
function ProcessorsGetUserProcessorInfo(context, userId) {
    const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments.callee.name, context);
    return (0, lodash_1.find)(userProcessorInfoStatus, { userId });
    span.end();
}
exports.ProcessorsGetUserProcessorInfo = ProcessorsGetUserProcessorInfo;
// Private Functions
function fetchSourceItemsQueued() {
    var arguments_5 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        if (fetchSourceItemsQueue.length === 0) {
            return;
        }
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_5.callee.name);
        const source = fetchSourceItemsQueue[0];
        userProcessorInfoStatusStart(span, source.userId);
        let processed = false;
        const lastSourceItemSaved = yield (0, SourceItemsData_1.SourceItemsDataGetLastForSource)(span, source.id);
        for (const processorsFile of processorsFiles) {
            if (!processed) {
                try {
                    const processor = yield Promise.resolve(`${processorsFile.path}`).then(s => require(s));
                    if (yield processor.test(source)) {
                        let nbNewItem = 0;
                        const newSourceItems = yield processor.fetchLatest(source, lastSourceItemSaved);
                        for (const newSourceItem of newSourceItems) {
                            if (!lastSourceItemSaved || newSourceItem.datePublished > lastSourceItemSaved.datePublished) {
                                nbNewItem++;
                                newSourceItem.sourceId = source.id;
                                newSourceItem.status = SourceItemStatus_1.SourceItemStatus.unread;
                                if (!newSourceItem.info) {
                                    newSourceItem.info = {};
                                }
                                if (!newSourceItem.id) {
                                    newSourceItem.id = (0, uuid_1.v4)();
                                }
                                yield (0, SourceItemsData_1.SourceItemsDataAdd)(span, newSourceItem);
                            }
                        }
                        logger.info(`Source ${source.id} has ${nbNewItem} new items`);
                        if (source.info.processorPath !== processorsFile.path) {
                            logger.info(`Updating source processor`);
                        }
                        source.info.processorPath = processorsFile.path;
                        source.info.dateFetched = new Date();
                        yield (0, SourcesData_1.SourcesDataUpdate)(span, source);
                        processed = true;
                    }
                }
                catch (err) {
                    logger.error(err);
                }
            }
        }
        if (!processed) {
            logger.warn(`No processor found for ${source.id}`);
        }
        userProcessorInfoStatusStop(span, source.userId);
        span.end();
        fetchSourceItemsQueue.shift();
        fetchSourceItemsQueued();
    });
}
function userProcessorInfoStatusStart(context, userId) {
    const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments.callee.name, context);
    let userStatus = (0, lodash_1.find)(userProcessorInfoStatus, { userId });
    if (!userStatus) {
        userStatus = {
            userId: userId,
            status: UserProcessorInfoStatus_1.UserProcessorInfoStatus.working,
        };
        userProcessorInfoStatus.push(userStatus);
    }
    userStatus.status = UserProcessorInfoStatus_1.UserProcessorInfoStatus.working;
    span.end();
}
function userProcessorInfoStatusStop(context, userId) {
    const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments.callee.name, context);
    const userStatus = (0, lodash_1.find)(userProcessorInfoStatus, { userId });
    if (userStatus) {
        userStatus.status = UserProcessorInfoStatus_1.UserProcessorInfoStatus.idle;
        userStatus.lastUpdate = new Date();
    }
    span.end();
}
