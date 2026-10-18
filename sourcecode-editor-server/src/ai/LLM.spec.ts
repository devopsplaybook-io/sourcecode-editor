import { LLMParseUpstreamChunk, LLMSSEFrame } from "./LLM";
import {
  LLMBuildMessages,
  LLMContext,
  LLMContextMessage,
  LLMPresetExists,
  LLMPresetModifiesCode,
  LLMSystemPrompt,
} from "./LLMPrompts";

jest.mock("../OTelContext", () => ({
  OTelLogger: () => ({
    createModuleLogger: () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  }),
}));

/* eslint-disable @typescript-eslint/no-explicit-any */

describe("LLMParseUpstreamChunk", () => {
  test("extracts deltas from complete data frames in order", () => {
    const chunk =
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n' +
      "\n" +
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n';
    const parsed = LLMParseUpstreamChunk(chunk);
    expect(parsed.deltas).toEqual(["Hello", " world"]);
    expect(parsed.done).toBe(false);
    expect(parsed.error).toBe(null);
    expect(parsed.rest).toBe("");
  });

  test("detects [DONE] and stops", () => {
    const chunk =
      'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\ndata: [DONE]\n\n';
    const parsed = LLMParseUpstreamChunk(chunk);
    expect(parsed.deltas).toEqual(["Hi"]);
    expect(parsed.done).toBe(true);
    // Parsing stops at [DONE]; the trailing frame separator is left unconsumed.
    expect(parsed.rest).toBe("\n");
  });

  test("keeps incomplete trailing lines in rest", () => {
    const chunk =
      'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\ndata: {"choices":[{"del';
    const parsed = LLMParseUpstreamChunk(chunk);
    expect(parsed.deltas).toEqual(["Hel"]);
    expect(parsed.done).toBe(false);
    expect(parsed.rest).toBe('data: {"choices":[{"del');
  });

  test("reconstructs frames split across chunks", () => {
    const full = 'data: {"choices":[{"delta":{"content":"abc"}}]}\n\n';
    const first = LLMParseUpstreamChunk(full.slice(0, 15));
    expect(first.deltas).toEqual([]);
    expect(first.rest).toBe(full.slice(0, 15));
    const second = LLMParseUpstreamChunk(first.rest + full.slice(15));
    expect(second.deltas).toEqual(["abc"]);
    expect(second.rest).toBe("");
  });

  test("skips malformed JSON lines without failing", () => {
    const chunk =
      "data: {not json}\n" +
      'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n';
    const parsed = LLMParseUpstreamChunk(chunk);
    expect(parsed.deltas).toEqual(["ok"]);
    expect(parsed.error).toBe(null);
  });

  test("extracts upstream error payloads", () => {
    const chunk = 'data: {"error":{"message":"Insufficient Balance"}}\n\n';
    const parsed = LLMParseUpstreamChunk(chunk);
    expect(parsed.deltas).toEqual([]);
    expect(parsed.error).toBe("Insufficient Balance");
  });

  test("ignores non-content deltas and non-data lines", () => {
    const chunk =
      ": keepalive\n" +
      'data: {"choices":[{"delta":{"role":"assistant"}}]}\n' +
      'data: {"choices":[{"delta":{"content":"x"}}]}\n\n';
    const parsed = LLMParseUpstreamChunk(chunk);
    expect(parsed.deltas).toEqual(["x"]);
  });

  test("handles CRLF line endings", () => {
    const chunk = 'data: {"choices":[{"delta":{"content":"hi"}}]}\r\n\r\n';
    const parsed = LLMParseUpstreamChunk(chunk);
    expect(parsed.deltas).toEqual(["hi"]);
  });
});

describe("LLMSSEFrame", () => {
  test("formats an event with JSON data", () => {
    expect(LLMSSEFrame("delta", { text: "hi" })).toBe(
      'event: delta\ndata: {"text":"hi"}\n\n'
    );
  });

  test("formats a meta event", () => {
    expect(LLMSSEFrame("meta", { model: "deepseek-chat" })).toBe(
      'event: meta\ndata: {"model":"deepseek-chat"}\n\n'
    );
  });

  test("handles undefined data", () => {
    expect(LLMSSEFrame("done", undefined)).toBe(
      'event: done\ndata: {}\n\n'
    );
  });
});

describe("LLMPresetExists", () => {
  test("accepts known preset ids", () => {
    expect(LLMPresetExists("explain")).toBe(true);
    expect(LLMPresetExists("refactor")).toBe(true);
    expect(LLMPresetExists("tests")).toBe(true);
    expect(LLMPresetExists("fix")).toBe(true);
    expect(LLMPresetExists("custom")).toBe(true);
  });

  test("rejects unknown preset ids", () => {
    expect(LLMPresetExists("")).toBe(false);
    expect(LLMPresetExists("delete")).toBe(false);
    expect(LLMPresetExists("EXPLAIN")).toBe(false);
  });
});

describe("LLMPresetModifiesCode", () => {
  test("explain does not modify code", () => {
    expect(LLMPresetModifiesCode("explain")).toBe(false);
  });

  test("code-modifying presets modify code", () => {
    expect(LLMPresetModifiesCode("refactor")).toBe(true);
    expect(LLMPresetModifiesCode("tests")).toBe(true);
    expect(LLMPresetModifiesCode("fix")).toBe(true);
    expect(LLMPresetModifiesCode("custom")).toBe(true);
  });
});

describe("LLMSystemPrompt", () => {
  test("modifying presets require one fenced block with the full file", () => {
    const prompt = LLMSystemPrompt("refactor");
    expect(prompt).toContain("ONE fenced code block");
    expect(prompt).toContain("FULL updated file content");
  });

  test("explain asks for prose only", () => {
    const prompt = LLMSystemPrompt("explain");
    expect(prompt).toContain("plain prose");
    expect(prompt).not.toContain("ONE fenced code block");
  });
});

describe("LLMContextMessage", () => {
  const baseContext = (overrides: Partial<LLMContext>): LLMContext => ({
    action: "refactor",
    file: "src/main.ts",
    content: "const a = 1;",
    selection: null,
    prompt: "",
    ...overrides,
  });

  test("whole-file context includes file, content and preset instruction", () => {
    const message = LLMContextMessage(baseContext({}));
    expect(message).toContain("File: src/main.ts");
    expect(message).toContain("const a = 1;");
    expect(message).toContain("Refactor this code");
  });

  test("selection context includes line range and both contents", () => {
    const message = LLMContextMessage(
      baseContext({
        selection: { content: "const a = 1;", startLine: 10, endLine: 20 },
      })
    );
    expect(message).toContain("lines 10-20");
    expect(message).toContain("Full file content:");
    expect(message).toContain("Selected lines (10-20):");
    expect(message).toContain("const a = 1;");
  });

  test("custom action uses the user prompt as instruction", () => {
    const message = LLMContextMessage(
      baseContext({ action: "custom", prompt: "Add error handling" })
    );
    expect(message).toContain("Add error handling");
    expect(message).not.toContain("Refactor this code");
  });
});

describe("LLMBuildMessages", () => {
  const context: LLMContext = {
    action: "fix",
    file: "app.py",
    content: "print(hello)",
    selection: null,
    prompt: "",
  };

  test("puts system prompt first and context message last", () => {
    const messages = LLMBuildMessages(context, []);
    expect(messages.length).toBe(2);
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("coding assistant");
    expect(messages[1].role).toBe("user");
    expect(messages[1].content).toContain("print(hello)");
  });

  test("inserts conversation history between system and current message", () => {
    const history = [
      { role: "user", content: "Explain" },
      { role: "assistant", content: "It prints hello." },
    ];
    const messages = LLMBuildMessages(context, history);
    expect(messages.length).toBe(4);
    expect(messages[1]).toEqual({ role: "user", content: "Explain" });
    expect(messages[2]).toEqual({
      role: "assistant",
      content: "It prints hello.",
    });
  });

  test("caps history to the last 10 messages", () => {
    const history: any[] = [];
    for (let i = 0; i < 15; i++) {
      history.push({ role: "user", content: `m${i}` });
    }
    const messages = LLMBuildMessages(context, history);
    expect(messages.length).toBe(12);
    expect(messages[1].content).toBe("m5");
    expect(messages[10].content).toBe("m14");
  });

  test("drops invalid history entries", () => {
    const history = [
      { role: "system", content: "injected" },
      { role: "user", content: "" },
      null,
      { role: "user", content: "valid" },
    ];
    const messages = LLMBuildMessages(context, history as any);
    expect(messages.length).toBe(3);
    expect(messages[1].content).toBe("valid");
  });
});
