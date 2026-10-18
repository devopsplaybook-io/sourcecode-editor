import { AuthService } from "./AuthService";
import Config from "./Config";

export interface LLMPreset {
  id: string;
  label: string;
  icon: string;
  modifiesCode: boolean;
}

export const LLMPresetList: LLMPreset[] = [
  { id: "explain", label: "Explain", icon: "bi-lightbulb", modifiesCode: false },
  { id: "refactor", label: "Refactor", icon: "bi-magic", modifiesCode: true },
  {
    id: "tests",
    label: "Add tests",
    icon: "bi-check2-square",
    modifiesCode: true,
  },
  { id: "fix", label: "Fix", icon: "bi-bug", modifiesCode: true },
];

export interface LLMHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LLMSelectionInfo {
  content: string;
  startLine: number;
  endLine: number;
}

export interface LLMChatParams {
  projectId: string;
  action: string;
  prompt: string;
  file: string;
  content: string;
  selection: LLMSelectionInfo | null;
  history: LLMHistoryMessage[];
}

export interface LLMChatStreamEvents {
  onMeta(meta: { model?: string }): void;
  onDelta(text: string): void;
  onDone(result: { latencyMs?: number }): void;
  onError(message: string): void;
}

export const LLM_HISTORY_MAX_MESSAGES = 10;

/**
 * Extracts the first fenced code block from a (possibly still streaming)
 * model answer. While the block is open, the lines collected so far are
 * returned so the code can be shown progressively. Returns null when no
 * code block has started.
 */
export function LLMExtractCode(streamedText: string): string | null {
  let inBlock = false;
  const codeLines: string[] = [];
  for (const line of streamedText.split("\n")) {
    if (!inBlock) {
      if (/^\s*```/.test(line)) {
        inBlock = true;
      }
      continue;
    }
    if (/^\s*```\s*$/.test(line)) {
      return codeLines.join("\n");
    }
    codeLines.push(line);
  }
  return inBlock ? codeLines.join("\n") : null;
}

/**
 * Returns the prose part of a model answer: everything before the first
 * fenced code block, or the whole trimmed text when there is no block.
 */
export function LLMExtractProse(streamedText: string): string {
  const fenceIndex = streamedText.search(/^\s*```/m);
  const prose =
    fenceIndex === -1 ? streamedText : streamedText.slice(0, fenceIndex);
  return prose.trim();
}

/**
 * One-line description of the context that will be sent to the model.
 */
export function LLMContextSummary(info: {
  file: string;
  contentLength: number;
  selection: LLMSelectionInfo | null;
  historyCount: number;
}): string {
  const parts: string[] = [info.file];
  if (info.selection) {
    parts.push(
      `selection lines ${info.selection.startLine}-${info.selection.endLine} ` +
        `(${info.selection.content.length} of ${info.contentLength} chars)`
    );
  } else {
    parts.push(`whole file (${info.contentLength} chars)`);
  }
  if (info.historyCount > 0) {
    parts.push(
      `${info.historyCount} earlier message${info.historyCount === 1 ? "" : "s"}`
    );
  }
  return parts.join(" · ");
}

/**
 * Parses complete SSE frames (`event: x\ndata: y\n\n`) out of a buffer.
 * Returns the parsed frames and the unconsumed remainder.
 */
export function LLMParseSSEBuffer(buffer: string): {
  frames: { event: string; data: string }[];
  rest: string;
} {
  const frames: { event: string; data: string }[] = [];
  let rest = buffer;
  for (;;) {
    const separatorIndex = rest.indexOf("\n\n");
    if (separatorIndex === -1) break;
    const block = rest.slice(0, separatorIndex);
    rest = rest.slice(separatorIndex + 2);
    let event = "message";
    let data = "";
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) {
        event = line.slice("event:".length).trim();
      } else if (line.startsWith("data:")) {
        data = line.slice("data:".length).trim();
      }
    }
    frames.push({ event, data });
  }
  return { frames, rest };
}

/**
 * Streams an LLM chat response over SSE (POST + fetch + ReadableStream,
 * since EventSource cannot send the JWT header). Calls the event handlers
 * as frames arrive; resolves when the stream is finished or aborted.
 */
export async function LLMChatStream(
  params: LLMChatParams,
  events: LLMChatStreamEvents,
  signal?: AbortSignal
): Promise<void> {
  const config = await Config.get();
  const auth = await AuthService.getAuthHeader();
  let response: Response;
  try {
    response = await fetch(
      `${config.SERVER_URL}/projects/${params.projectId}/llm/chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(auth.headers || {}),
        },
        body: JSON.stringify({
          action: params.action,
          prompt: params.prompt,
          file: params.file,
          content: params.content,
          selection: params.selection,
          history: params.history.slice(-LLM_HISTORY_MAX_MESSAGES),
        }),
        signal,
      }
    );
  } catch (error) {
    if ((error as Error).name === "AbortError") return;
    events.onError((error as Error).message || "Connection failed");
    return;
  }
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body && body.error) message = body.error;
    } catch {
      // Keep the generic status message.
    }
    events.onError(message);
    return;
  }
  if (!response.body) {
    events.onError("Streaming is not supported by this browser");
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const { frames, rest } = LLMParseSSEBuffer(buffer);
      buffer = rest;
      for (const frame of frames) {
        let payload: any = {};
        try {
          payload = JSON.parse(frame.data || "{}");
        } catch {
          // Ignore frames with malformed payloads.
        }
        if (frame.event === "meta") {
          events.onMeta(payload);
        } else if (frame.event === "delta") {
          events.onDelta(typeof payload.text === "string" ? payload.text : "");
        } else if (frame.event === "done") {
          finished = true;
          events.onDone(payload);
        } else if (frame.event === "error") {
          finished = true;
          events.onError(payload.message || "LLM error");
        }
      }
      if (finished) break;
    }
    if (!finished) {
      events.onError("Connection closed before the response completed");
    }
  } catch (error) {
    if ((error as Error).name === "AbortError") return;
    events.onError((error as Error).message || "Stream failed");
  }
}
