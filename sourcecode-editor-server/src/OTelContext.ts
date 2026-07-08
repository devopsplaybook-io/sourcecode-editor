import {
  createOTelContext,
  OTelContext,
} from "@devopsplaybook.io/common-utils";
import { StandardTracer, StandardMeter } from "@devopsplaybook.io/otel-utils";

const otelContext: OTelContext = createOTelContext();

export function OTelSetTracer(tracer: StandardTracer): void {
  otelContext.OTelSetTracer(tracer);
}

export function OTelSetMeter(meter: StandardMeter): void {
  otelContext.OTelSetMeter(meter);
}

export function OTelTracer(): StandardTracer {
  return otelContext.OTelTracer();
}

export function OTelMeter(): StandardMeter {
  return otelContext.OTelMeter();
}

export function OTelLogger() {
  return otelContext.OTelLogger();
}

export { otelContext };
