"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StandardTracerAppendHeader =
  exports.StandardTracerGetTracer =
  exports.StandardTracerStartSpan =
  exports.StandardTracerGetSpanFromRequest =
  exports.StandardTracerInitTelemetry =
    void 0;
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const sdk_trace_node_1 = require("@opentelemetry/sdk-trace-node");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const resources_1 = require("@opentelemetry/resources");
const id_generator_aws_xray_1 = require("@opentelemetry/id-generator-aws-xray");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const api_1 = require("@opentelemetry/api");
const os = require("os");
const api_2 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const context_async_hooks_1 = require("@opentelemetry/context-async-hooks");
let tracerInstance;
let config;
const propagator = new core_1.W3CTraceContextPropagator();
//
function StandardTracerInitTelemetry(initConfig) {
  config = initConfig;
  const provider = new sdk_trace_node_1.NodeTracerProvider({
    idGenerator: new id_generator_aws_xray_1.AWSXRayIdGenerator(),
    resource: new resources_1.Resource({
      [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: `${config.SERVICE_ID}`,
      [semantic_conventions_1.SemanticResourceAttributes.SERVICE_VERSION]: `${config.VERSION}`,
      [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAMESPACE]: "sourcecode-editor",
      [semantic_conventions_1.SemanticResourceAttributes.HOST_NAME]: os.hostname(),
    }),
  });
  provider.register();
  if (config.OPENTELEMETRY_COLLECTOR_HTTP) {
    const exporter = new exporter_trace_otlp_http_1.OTLPTraceExporter({
      url: config.OPENTELEMETRY_COLLECTOR_HTTP,
      headers: {},
    });
    provider.addSpanProcessor(new sdk_trace_base_1.BatchSpanProcessor(exporter));
  }
  const contextManager = new context_async_hooks_1.AsyncHooksContextManager();
  contextManager.enable();
  api_1.default.context.setGlobalContextManager(contextManager);
}
exports.StandardTracerInitTelemetry = StandardTracerInitTelemetry;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StandardTracerGetSpanFromRequest(req) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return req.tracerSpanApi;
}
exports.StandardTracerGetSpanFromRequest = StandardTracerGetSpanFromRequest;
function StandardTracerStartSpan(name, parentSpan) {
  const tracer = StandardTracerGetTracer();
  if (parentSpan) {
    return tracer.startSpan(name, undefined, api_1.default.trace.setSpan(api_1.default.context.active(), parentSpan));
  }
  const span = tracer.startSpan(name);
  span.setAttribute(semantic_conventions_1.SemanticAttributes.HTTP_METHOD, `BACKEND`);
  span.setAttribute(
    semantic_conventions_1.SemanticAttributes.HTTP_URL,
    `${config.SERVICE_ID}-${config.VERSION}-${name}`
  );
  span.setAttribute(
    semantic_conventions_1.SemanticAttributes.HTTP_SERVER_NAME,
    `${config.SERVICE_ID}-${config.VERSION}`
  );
  return span;
}
exports.StandardTracerStartSpan = StandardTracerStartSpan;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StandardTracerGetTracer() {
  if (!tracerInstance) {
    tracerInstance = api_1.default.trace.getTracer(`${config.SERVICE_ID}-${config.VERSION}`);
  }
  return tracerInstance;
}
exports.StandardTracerGetTracer = StandardTracerGetTracer;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StandardTracerAppendHeader(context, headers = {}) {
  if (!headers) {
    headers = {};
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  propagator.inject(
    api_2.trace.setSpanContext(api_2.ROOT_CONTEXT, context.spanContext()),
    headers,
    api_2.defaultTextMapSetter
  );
  return headers;
}
exports.StandardTracerAppendHeader = StandardTracerAppendHeader;
