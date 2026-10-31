import { Span } from "@opentelemetry/sdk-trace";
import axios from "axios";
import { OTelLogger, OTelTracer } from "../OTelContext";
import { SpanStatusCode } from "@opentelemetry/api";
import { Config } from "../Config";

const logger = OTelLogger().createModuleLogger("LLM");

export interface LLMUpstreamChunk {
  deltas: string[];
  error: string | null;
  done: boolean;
  rest: string;
}

/**
 * Parses OpenAI-compatible SSE chunks from the upstream LLM API.
 * Pure function: feed the accumulated buffer, get complete deltas back
 * plus the unconsumed remainder (a line may arrive split across chunks).
 */
export function LLMParseUpstreamChunk(buffer: string): LLMUpstreamChunk {
  const deltas: string[] = [];
  let error: string | null = null;
  let done = false;
  let rest = buffer;
  for (;;) {
    const newlineIndex = rest.indexOf("\n");
    if (newlineIndex === -1) break;
    const line = rest.slice(0, newlineIndex).replace(/\r$/, "");
    rest = rest.slice(newlineIndex + 1);
    if (!line.startsWith("data:")) continue;
    const payload = line.slice("data:".length).trim();
    if (payload === "[DONE]") {
      done = true;
      break;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: any;
    try {
      parsed = JSON.parse(payload);
    } catch {
      // Tolerate malformed lines: skip them and keep streaming.
      continue;
    }
    if (parsed && parsed.error) {
      error = parsed.error.message || String(parsed.error);
      break;
    }
    const delta = parsed?.choices?.[0]?.delta?.content;
    if (typeof delta === "string" && delta) {
      deltas.push(delta);
    }
  }
  return { deltas, error, done, rest };
}

export function LLMSSEFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data ?? {})}\n\n`;
}

export interface LLMStreamResult {
  text: string;
  latencyMs: number;
}

export async function LLMStreamRequest(
  context: Span,
  config: Config,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: any[],
  onDelta: (text: string) => void,
  signal?: AbortSignal
): Promise<LLMStreamResult> {
  const span = OTelTracer().startSpan("LLMStreamRequest", context);
  const startedAt = Date.now();
  try {
    const model = config.LLM_MODEL;
    span.addEvent(`Model: ${model}`);
    span.addEvent(`Context:\n ${JSON.stringify(messages, null, 2)}`);
    logger.info(
      `LLM Stream Request ${model}: ${JSON.stringify(messages).substring(
        0,
        100
      )}...`,
      span
    );
    const response = await axios.post(
      config.LLM_API_URL,
      {
        model,
        messages,
        stream: true,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.LLM_API_KEY}`,
        },
        responseType: "stream",
        signal,
      }
    );
    let buffer = "";
    let text = "";
    let upstreamError: string | null = null;
    for await (const chunk of response.data as AsyncIterable<Buffer>) {
      buffer += chunk.toString();
      const parsed = LLMParseUpstreamChunk(buffer);
      buffer = parsed.rest;
      if (parsed.error && !upstreamError) upstreamError = parsed.error;
      for (const delta of parsed.deltas) {
        text += delta;
        onDelta(delta);
      }
      if (parsed.done || parsed.error) break;
    }
    const latencyMs = Date.now() - startedAt;
    if (upstreamError) {
      throw new Error(upstreamError);
    }
    logger.info(
      `LLM Stream completed in ${latencyMs}ms (${text.length} chars)`,
      span
    );
    span.end();
    return { text, latencyMs };
  } catch (error) {
    const message = await LLMUpstreamErrorMessage(error);
    logger.error(`LLM Stream Error: ${message}`, error, span);
    span.setStatus({ code: SpanStatusCode.ERROR, message });
    span.addEvent("LLM Error");
    span.end();
    throw new Error(message);
  }
}

async function LLMUpstreamErrorMessage(error: unknown): Promise<string> {
  const anyError = error as {
    message?: string;
    response?: { data?: unknown };
  };
  let message = anyError?.message || "LLM request failed";
  const data = anyError?.response?.data;
  if (typeof data === "string") {
    message = LLMErrorMessageFromBody(data) || message;
  } else if (data && typeof (data as { on?: unknown }).on === "function") {
    // Error body arrives as a stream when responseType is "stream".
    const body = await LLMReadStream(data as NodeJS.ReadableStream);
    message = LLMErrorMessageFromBody(body) || message;
  } else if (
    data &&
    typeof data === "object" &&
    (data as { error?: { message?: string } }).error?.message
  ) {
    message = (data as { error: { message: string } }).error.message;
  }
  return message;
}

function LLMErrorMessageFromBody(body: string): string | null {
  try {
    const parsed = JSON.parse(body);
    return parsed?.error?.message || null;
  } catch {
    return null;
  }
}

function LLMReadStream(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    const timer = setTimeout(() => resolve(body), 2000);
    timer.unref?.();
    stream.on("data", (chunk: Buffer | string) => {
      body += chunk.toString();
    });
    stream.on("end", () => {
      clearTimeout(timer);
      resolve(body);
    });
    stream.on("error", () => {
      clearTimeout(timer);
      resolve(body);
    });
  });
}
