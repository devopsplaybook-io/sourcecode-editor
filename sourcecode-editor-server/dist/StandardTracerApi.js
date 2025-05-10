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
exports.StandardTracerApiRegisterHooks = void 0;
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const api_1 = require("@opentelemetry/api");
const api_2 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const sdk_node_1 = require("@opentelemetry/sdk-node");
const Logger_1 = require("./utils-std-ts/Logger");
const StandardTracer_1 = require("./utils-std-ts/StandardTracer");
const propagator = new core_1.W3CTraceContextPropagator();
const logger = new Logger_1.Logger("StandardTracerApi");
function StandardTracerApiRegisterHooks(fastify, config) {
    return __awaiter(this, void 0, void 0, function* () {
        fastify.addHook("onRequest", (req) => __awaiter(this, void 0, void 0, function* () {
            if (req.url.indexOf("/api") !== 0) {
                return;
            }
            let spanName = `${req.method}-${req.url}`;
            let urlName = req.url;
            if (config.OPENTELEMETRY_COLLECTOR_AWS) {
                spanName = `${config.SERVICE_ID}-${config.VERSION}`;
                urlName = `${config.SERVICE_ID}-${config.VERSION}-${req.method}-${req.url}`;
            }
            const callerContext = propagator.extract(api_2.ROOT_CONTEXT, req.headers, api_2.defaultTextMapGetter);
            sdk_node_1.api.context.with(callerContext, () => {
                const span = (0, StandardTracer_1.StandardTracerStartSpan)(spanName);
                span.setAttribute(semantic_conventions_1.SemanticAttributes.HTTP_METHOD, req.method);
                span.setAttribute(semantic_conventions_1.SemanticAttributes.HTTP_URL, urlName);
                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                req.tracerSpanApi = span;
            });
        }));
        fastify.addHook("onResponse", (req, reply) => __awaiter(this, void 0, void 0, function* () {
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            const span = req.tracerSpanApi;
            if (reply.statusCode > 299) {
                span.status.code = api_1.SpanStatusCode.ERROR;
            }
            else {
                span.status.code = api_1.SpanStatusCode.OK;
            }
            span.setAttribute(semantic_conventions_1.SemanticAttributes.HTTP_STATUS_CODE, reply.statusCode);
            span.end();
        }));
        fastify.addHook("onError", (req, reply, error) => __awaiter(this, void 0, void 0, function* () {
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            const span = req.tracerSpanApi;
            span.status.code = api_1.SpanStatusCode.ERROR;
            span.recordException(error);
            logger.error(error);
        }));
    });
}
exports.StandardTracerApiRegisterHooks = StandardTracerApiRegisterHooks;
