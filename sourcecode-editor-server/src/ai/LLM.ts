import { Span } from "@opentelemetry/sdk-trace-base";
import axios from "axios";
import { OTelLogger, OTelTracer } from "../OTelContext";
import { SpanStatusCode } from "@opentelemetry/api";
import { Config } from "../Config";

const logger = OTelLogger().createModuleLogger("LLM");

export async function LLMRequest(
  context: Span,
  config: Config,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: any[],
): Promise<string> {
  const span = OTelTracer().startSpan("LLMRequest", context);
  try {
    const model = config.LLM_MODEL;
    span.addEvent(`Model: ${model}`);
    span.addEvent(`Context:\n ${JSON.stringify(messages, null, 2)}`);
    logger.info(
      `LLM Request ${model}: ${JSON.stringify(messages).substring(0, 100)}...`,
      span,
    );
    const response = await axios.post(
      config.LLM_API_URL,
      {
        model,
        messages,
        stream: false,
        response_format: {
          type: "json_object",
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.LLM_API_KEY}`,
        },
      },
    );
    span.addEvent(
      `Response:\n ${JSON.stringify(
        response.data.choices[0].message.content,
        null,
        2,
      )}`,
    );
    span.end();
    return response.data.choices[0].message.content;
  } catch (error) {
    logger.error(
      `LLM Request Error: ${
        error.response?.data?.error?.message || error.message
      }`,
      error,
      span,
    );
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    span.addEvent("LLM Error");
    span.end();
    // eslint-disable-next-line preserve-caught-error
    throw new Error(error.response?.data?.error?.message || error.message);
  }
}
