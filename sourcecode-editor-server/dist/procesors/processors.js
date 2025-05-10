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
exports.Processors = void 0;
const SourceItemsData_1 = require("../data/SourceItemsData");
const SourcesData_1 = require("../data/SourcesData");
const SourceItemStatus_1 = require("../model/SourceItemStatus");
const Logger_1 = require("../utils-std-ts/Logger");
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
const fs = require("fs-extra");
const path = require("path");
const _ = require("lodash");
const uuid_1 = require("uuid");
const UserProcessorInfoStatus_1 = require("../model/UserProcessorInfoStatus");
const logger = new Logger_1.Logger("Processor");
let config;
let processorFiles = [];
const userProcessorInfoStatus = [];
const fetchSourceItemsQueue = [];
class Processors {
    //
    static init(context, configIn) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("Processors_init", context);
            config = configIn;
            for (const processorFile of yield fs.readdir(config.PROCESSORS_USER)) {
                if (path.extname(processorFile) === ".js") {
                    processorFiles.push({
                        name: processorFile,
                        path: `${path.resolve(config.PROCESSORS_USER)}/${processorFile}`,
                    });
                }
            }
            for (const processorFile of yield fs.readdir(config.PROCESSORS_SYSTEM)) {
                if (path.extname(processorFile) === ".js") {
                    processorFiles.push({
                        name: processorFile,
                        path: `${path.resolve(config.PROCESSORS_SYSTEM)}/${processorFile}`,
                    });
                }
            }
            processorFiles = _.sortBy(processorFiles, ["name"]);
            logger.info(`Found ${processorFiles.length} processors`);
            span.end();
        });
    }
    static getInfos(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("Processors_getInfos", context);
            const processorInfos = [];
            for (const processorFile of processorFiles) {
                try {
                    const processor = yield Promise.resolve(`${processorFile.path}`).then(s => require(s));
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
    static checkSource(context, source) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("Processors_checkSource", context);
            if (!source.info.processorPath) {
                Processors.userProcessorInfoStatusStart(span, source.userId);
                let processed = false;
                for (const processorFile of processorFiles) {
                    if (!processed) {
                        try {
                            const processor = yield Promise.resolve(`${processorFile.path}`).then(s => require(s));
                            const sourceInfo = yield processor.test(source);
                            if (sourceInfo) {
                                sourceInfo.processorPath = processorFile.path;
                                source.name = sourceInfo.name;
                                if (!source.info) {
                                    source.info = {};
                                }
                                source.info = _.merge(source.info, sourceInfo);
                                yield SourcesData_1.SourcesData.update(span, source);
                                processed = true;
                            }
                        }
                        catch (err) {
                            // Nothing to do
                            // logger.error(err);
                        }
                    }
                    Processors.userProcessorInfoStatusStop(span, source.userId);
                }
            }
            span.end();
        });
    }
    static fetchSourceItemsForUser(context, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("Processors_fetchSourceItemsForUser", context);
            const sources = yield SourcesData_1.SourcesData.listForUser(span, userId);
            for (const source of sources) {
                yield Processors.fetchSourceItems(span, source);
            }
            span.end();
        });
    }
    static fetchSourceItems(context, source) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!_.find(fetchSourceItemsQueue, { id: source.id })) {
                fetchSourceItemsQueue.push(source);
                if (fetchSourceItemsQueue.length === 1) {
                    Processors.fetchSourceItemsQueued();
                }
            }
        });
    }
    static fetchSourceItemsQueued() {
        return __awaiter(this, void 0, void 0, function* () {
            if (fetchSourceItemsQueue.length === 0) {
                return;
            }
            const span = StandardTracer_1.StandardTracer.startSpan("Processors_fetchSourceItemsQueued");
            const source = fetchSourceItemsQueue[0];
            Processors.userProcessorInfoStatusStart(span, source.userId);
            let processed = false;
            const lastSourceItemSaved = yield SourceItemsData_1.SourceItemsData.getLastForSource(span, source.id);
            for (const processorFile of processorFiles) {
                if (!processed) {
                    try {
                        const processor = yield Promise.resolve(`${processorFile.path}`).then(s => require(s));
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
                                    yield SourceItemsData_1.SourceItemsData.add(span, newSourceItem);
                                }
                            }
                            logger.info(`Source ${source.id} has ${nbNewItem} new items`);
                            if (source.info.processorPath !== processorFile.path) {
                                logger.info(`Updating source processor`);
                            }
                            source.info.processorPath = processorFile.path;
                            source.info.dateFetched = new Date();
                            yield SourcesData_1.SourcesData.update(span, source);
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
            Processors.userProcessorInfoStatusStop(span, source.userId);
            span.end();
            fetchSourceItemsQueue.shift();
            Processors.fetchSourceItemsQueued();
        });
    }
    static getUserProcessorInfo(context, userId) {
        const span = StandardTracer_1.StandardTracer.startSpan("Processors_getUserProcessorInfo", context);
        return _.find(userProcessorInfoStatus, { userId });
        span.end();
    }
    static userProcessorInfoStatusStart(context, userId) {
        const span = StandardTracer_1.StandardTracer.startSpan("Processors_userProcessorInfoStatusStart", context);
        let userStatus = _.find(userProcessorInfoStatus, { userId });
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
    static userProcessorInfoStatusStop(context, userId) {
        const span = StandardTracer_1.StandardTracer.startSpan("Processors_userProcessorInfoStatusStop", context);
        const userStatus = _.find(userProcessorInfoStatus, { userId });
        if (userStatus) {
            userStatus.status = UserProcessorInfoStatus_1.UserProcessorInfoStatus.idle;
            userStatus.lastUpdate = new Date();
        }
        span.end();
    }
}
exports.Processors = Processors;
