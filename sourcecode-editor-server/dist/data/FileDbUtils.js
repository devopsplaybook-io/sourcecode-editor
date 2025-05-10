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
exports.FileDBUtils = void 0;
const fs = require("fs-extra");
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
const Logger_1 = require("../utils-std-ts/Logger");
const Timeout_1 = require("../utils-std-ts/Timeout");
const logger = new Logger_1.Logger("FileDBUtils");
let config;
class FileDBUtils {
    //
    static init(configIn) {
        config = configIn;
    }
    /* eslint-disable @typescript-eslint/no-explicit-any */
    static load(context, collection, defaultData) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("FileDBUtils_load", context);
            let data = defaultData;
            for (let i = 0; i < Math.max(config.FILE_REDUNDANCY, 1); i++) {
                const filename = `${config.DATA_DIR}/${collection}${i > 0 ? `.${i}` : ""}.json`;
                if (fs.existsSync(filename)) {
                    try {
                        data = yield fs.readJSON(filename);
                        break;
                    }
                    catch (err) {
                        logger.error(`Can't load file: ${err}`);
                    }
                }
            }
            yield FileDBUtils.save(span, collection, data);
            span.end();
            return data;
        });
    }
    /* eslint-disable @typescript-eslint/no-explicit-any */
    static save(context, collection, content) {
        return __awaiter(this, void 0, void 0, function* () {
            for (let i = 0; i < Math.max(config.FILE_REDUNDANCY, 1); i++) {
                if (i > 0) {
                    yield Timeout_1.Timeout.wait(200);
                }
                yield fs.writeJSON(`${config.DATA_DIR}/${collection}${i > 0 ? `.${i}` : ""}.json`, content);
            }
        });
    }
}
exports.FileDBUtils = FileDBUtils;
