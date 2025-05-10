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
exports.SqlDbUtilsQuerySQL = exports.SqlDbUtilsExecSQLFile = exports.SqlDbUtilsExecSQL = exports.SqlDbUtilsInit = void 0;
const sqlite3_1 = require("sqlite3");
const fs = require("fs-extra");
const Logger_1 = require("./Logger");
const StandardTracer_1 = require("./StandardTracer");
const logger = new Logger_1.Logger("SqlDbutils");
const SQL_DIR = `${__dirname}/../../sql`;
let database;
function SqlDbUtilsInit(context, config) {
    var arguments_1 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_1.callee.name, context);
        yield fs.ensureDir(config.DATA_DIR);
        database = new sqlite3_1.Database(`${config.DATA_DIR}/database.db`);
        yield SqlDbUtilsExecSQLFile(span, `${SQL_DIR}/init-0000.sql`);
        const initFiles = (yield yield fs.readdir(`${SQL_DIR}`)).sort();
        let dbVersionApplied = 0;
        const dbVersionQuery = yield SqlDbUtilsQuerySQL(span, "SELECT MAX(value) as maxVerion FROM metadata WHERE type='db_version'");
        if (dbVersionQuery[0].maxVerion) {
            dbVersionApplied = Number(dbVersionQuery[0].maxVerion);
        }
        logger.info(`Current DB Version: ${dbVersionApplied}`);
        for (const initFile of initFiles) {
            const regex = /init-(\d+).sql/g;
            const match = regex.exec(initFile);
            if (match) {
                const dbVersionInitFile = Number(match[1]);
                if (dbVersionInitFile > dbVersionApplied) {
                    logger.info(`Loading init file: ${initFile}`);
                    yield SqlDbUtilsExecSQLFile(span, `${SQL_DIR}/${initFile}`);
                    yield SqlDbUtilsQuerySQL(span, 'INSERT INTO metadata (type, value, dateCreated) VALUES ("db_version",?,?)', [
                        dbVersionInitFile,
                        new Date().toISOString(),
                    ]);
                }
            }
        }
        span.end();
    });
}
exports.SqlDbUtilsInit = SqlDbUtilsInit;
function SqlDbUtilsExecSQL(context, sql, params = []) {
    const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments.callee.name, context);
    return new Promise((resolve, reject) => {
        database.run(sql, params, (error) => {
            span.end();
            if (error) {
                reject(error);
            }
            else {
                resolve();
            }
        });
    });
}
exports.SqlDbUtilsExecSQL = SqlDbUtilsExecSQL;
function SqlDbUtilsExecSQLFile(context, filename) {
    var arguments_2 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_2.callee.name, context);
        const sql = (yield fs.readFile(filename)).toString();
        return new Promise((resolve, reject) => {
            database.exec(sql, (error) => {
                span.end();
                if (error) {
                    reject(error);
                }
                else {
                    resolve();
                }
            });
        });
    });
}
exports.SqlDbUtilsExecSQLFile = SqlDbUtilsExecSQLFile;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SqlDbUtilsQuerySQL(context, sql, params = [], debug = false) {
    const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments.callee.name, context);
    if (debug) {
        console.log(sql);
    }
    return new Promise((resolve, reject) => {
        database.all(sql, params, (error, rows) => {
            span.end();
            if (error) {
                logger.error(`SQL ERROR: ${sql}`);
                reject(error);
            }
            else {
                resolve(rows);
            }
        });
    });
}
exports.SqlDbUtilsQuerySQL = SqlDbUtilsQuerySQL;
