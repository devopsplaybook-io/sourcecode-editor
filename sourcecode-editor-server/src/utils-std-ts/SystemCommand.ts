import { SpanStatusCode } from "@opentelemetry/api";
import { Span } from "@opentelemetry/sdk-trace-base";
import * as childProcess from "child_process";
import { OTelTracer } from "../OTelContext";

export function SystemCommandExecute(
  context: Span,
  command: string,
  options = {}
): Promise<string> {
  const span = OTelTracer().startSpan("SystemCommandExecute", context);
  const exec = childProcess.exec;
  return new Promise<string>((resolve, reject) => {
    exec(command, options, (error, stdout) => {
      if (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        span.end();
        reject(error);
      } else {
        span.end();
        resolve(stdout);
      }
    });
  });
}
