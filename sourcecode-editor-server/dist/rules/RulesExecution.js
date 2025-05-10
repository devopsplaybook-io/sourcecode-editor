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
exports.RulesExecutionExecuteUserRules = void 0;
const Logger_1 = require("../utils-std-ts/Logger");
const StandardTracer_1 = require("../utils-std-ts/StandardTracer");
const SqlDbUtils_1 = require("../utils-std-ts/SqlDbUtils");
const logger = new Logger_1.Logger("RulesExecution");
function RulesExecutionExecuteUserRules(context, rules) {
    var arguments_1 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_1.callee.name, context);
        for (const ruleInfo of rules.info) {
            if (ruleInfo.autoRead) {
                for (const rulePattern of ruleInfo.autoRead) {
                    if (ruleInfo.isRoot) {
                        yield execRuleForUser(span, RuleAction.archive, rules.userId, {
                            maxDate: new Date(new Date().getTime() - rulePattern.ageDays * 24 * 3600 * 1000),
                            pattern: rulePattern.pattern,
                        });
                    }
                    else if (ruleInfo.labelName) {
                        yield execRuleForLabel(span, RuleAction.archive, ruleInfo.labelName, rules.userId, {
                            maxDate: new Date(new Date().getTime() - rulePattern.ageDays * 24 * 3600 * 1000),
                            pattern: rulePattern.pattern,
                        });
                    }
                    else if (ruleInfo.sourceId) {
                        yield execRuleForSource(span, RuleAction.archive, ruleInfo.sourceId, {
                            maxDate: new Date(new Date().getTime() - rulePattern.ageDays * 24 * 3600 * 1000),
                        });
                    }
                }
            }
            if (ruleInfo.autoDelete) {
                for (const rulePattern of ruleInfo.autoDelete) {
                    if (ruleInfo.isRoot) {
                        yield execRuleForUser(span, RuleAction.delete, rules.userId, {
                            maxDate: new Date(new Date().getTime() - rulePattern.ageDays * 24 * 3600 * 1000),
                            pattern: rulePattern.pattern,
                        });
                    }
                    else if (ruleInfo.labelName) {
                        yield execRuleForLabel(span, RuleAction.delete, ruleInfo.labelName, rules.userId, {
                            maxDate: new Date(new Date().getTime() - rulePattern.ageDays * 24 * 3600 * 1000),
                            pattern: rulePattern.pattern,
                        });
                    }
                    else if (ruleInfo.sourceId) {
                        yield execRuleForSource(span, RuleAction.delete, ruleInfo.sourceId, {
                            maxDate: new Date(new Date().getTime() - rulePattern.ageDays * 24 * 3600 * 1000),
                        });
                    }
                }
            }
        }
        logger.info(`Rules for user ${rules.userId} executed`);
        span.end();
    });
}
exports.RulesExecutionExecuteUserRules = RulesExecutionExecuteUserRules;
// Private Fucntions
var RuleAction;
(function (RuleAction) {
    RuleAction["delete"] = "delete";
    RuleAction["archive"] = "archive";
})(RuleAction || (RuleAction = {}));
function execRuleForUser(context, action, userId, searchOptions) {
    var arguments_2 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_2.callee.name, context);
        yield (0, SqlDbUtils_1.SqlDbUtilsQuerySQL)(span, getRuleActionSql(action) +
            "WHERE sources_items.sourceId IN ( SELECT id FROM sources WHERE userId = ? ) " +
            getAgeFilterQuery(searchOptions) +
            getPatternFilterQuery(searchOptions), [userId]);
        span.end();
    });
}
function execRuleForSource(context, action, sourceId, searchOptions) {
    var arguments_3 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_3.callee.name, context);
        yield (0, SqlDbUtils_1.SqlDbUtilsQuerySQL)(span, getRuleActionSql(action) +
            "WHERE sourceId = ? " +
            getAgeFilterQuery(searchOptions) +
            getPatternFilterQuery(searchOptions), [sourceId]);
        span.end();
    });
}
function execRuleForLabel(context, action, label, userId, searchOptions) {
    var arguments_4 = arguments;
    return __awaiter(this, void 0, void 0, function* () {
        const span = (0, StandardTracer_1.StandardTracerStartSpan)(arguments_4.callee.name, context);
        yield (0, SqlDbUtils_1.SqlDbUtilsQuerySQL)(span, getRuleActionSql(action) +
            "WHERE sources_items.sourceId IN ( " +
            "    SELECT sources.id " +
            "    FROM sources, sources_labels " +
            "    WHERE sources.userId = ? " +
            "          AND sources_labels.sourceId = sources.id AND sources_labels.name LIKE ? " +
            "  ) " +
            getAgeFilterQuery(searchOptions) +
            getPatternFilterQuery(searchOptions), [userId, `${label}%`]);
        span.end();
    });
}
function getRuleActionSql(ruleAction) {
    if (ruleAction == RuleAction.delete) {
        return " DELETE FROM sources_items ";
    }
    return ' UPDATE sources_items SET status = "read" ';
}
function getAgeFilterQuery(searchOptions) {
    if (searchOptions.maxDate) {
        return ` AND sources_items.datePublished <= '${searchOptions.maxDate.toISOString()}' `;
    }
    return "";
}
function getPatternFilterQuery(searchOptions) {
    if (searchOptions.pattern) {
        return ` AND sources_items.title GLOB '${searchOptions.pattern.replace(/'/g, "''")}' `;
    }
    return "";
}
