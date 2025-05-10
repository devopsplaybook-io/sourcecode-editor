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
exports.SqlDbutils = void 0;
const sqlite3_1 = require("sqlite3");
const fs = require("fs-extra");
const Logger_1 = require("../utils-std-ts/Logger");
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
const logger = new Logger_1.Logger("SqlDbutils");
const SQL_DIR = `${__dirname}/../../sql`;
let database;
class SqlDbutils {
    //
    static init(context, config) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("SqlDbutils_init", context);
            yield fs.ensureDir(config.DATA_DIR);
            database = new sqlite3_1.Database(`${config.DATA_DIR}/database.db`);
            yield SqlDbutils.execSQLFile(span, `${SQL_DIR}/init-0000.sql`);
            const initFiles = (yield yield fs.readdir(`${SQL_DIR}`)).sort();
            let dbVersionApplied = 0;
            const dbVersionQuery = yield SqlDbutils.querySQL(span, "SELECT MAX(value) as maxVerion FROM metadata WHERE type='db_version'");
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
                        yield SqlDbutils.execSQLFile(span, `${SQL_DIR}/${initFile}`);
                        yield SqlDbutils.querySQL(span, 'INSERT INTO metadata (type, value, dateCreated) VALUES ("db_version",?,?)', [
                            dbVersionInitFile,
                            new Date().toISOString(),
                        ]);
                    }
                }
            }
            span.end();
        });
    }
    static execSQL(context, sql, params = []) {
        const span = StandardTracer_1.StandardTracer.startSpan("SqlDbutils_execSQL", context);
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
    static execSQLFile(context, filename) {
        return __awaiter(this, void 0, void 0, function* () {
            const span = StandardTracer_1.StandardTracer.startSpan("SqlDbutils_execSQLFile", context);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static querySQL(context, sql, params = []) {
        const span = StandardTracer_1.StandardTracer.startSpan("SqlDbutils_querySQL", context);
        return new Promise((resolve, reject) => {
            database.all(sql, params, (error, rows) => {
                span.end();
                if (error) {
                    reject(error);
                }
                else {
                    resolve(rows);
                }
            });
        });
    }
}
exports.SqlDbutils = SqlDbutils;
