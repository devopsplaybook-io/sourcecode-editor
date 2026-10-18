import { describe, expect, it } from "vitest";
import {
  LLMParseSSEBuffer,
  LLMContextSummary,
  LLMExtractCode,
  LLMExtractProse,
} from "./LLMAssistant";

describe("LLMParseSSEBuffer", () => {
  it("parses complete frames with event and data", () => {
    const { frames, rest } = LLMParseSSEBuffer(
      'event: meta\ndata: {"model":"deepseek-chat"}\n\n'
    );
    expect(frames).toEqual([
      { event: "meta", data: '{"model":"deepseek-chat"}' },
    ]);
    expect(rest).toBe("");
  });

  it("parses multiple frames in order", () => {
    const { frames } = LLMParseSSEBuffer(
      'event: delta\ndata: {"text":"a"}\n\nevent: delta\ndata: {"text":"b"}\n\nevent: done\ndata: {"latencyMs":1200}\n\n'
    );
    expect(frames.length).toBe(3);
    expect(frames[0]).toEqual({ event: "delta", data: '{"text":"a"}' });
    expect(frames[2]).toEqual({ event: "done", data: '{"latencyMs":1200}' });
  });

  it("keeps incomplete frames in rest", () => {
    const buffer = 'event: delta\ndata: {"text":"a"}\n\nevent: del';
    const { frames, rest } = LLMParseSSEBuffer(buffer);
    expect(frames.length).toBe(1);
    expect(rest).toBe("event: del");
  });

  it("reconstructs a frame split across chunks", () => {
    const full = 'event: delta\ndata: {"text":"hi"}\n\n';
    const first = LLMParseSSEBuffer(full.slice(0, 12));
    expect(first.frames).toEqual([]);
    expect(first.rest).toBe(full.slice(0, 12));
    const second = LLMParseSSEBuffer(first.rest + full.slice(12));
    expect(second.frames).toEqual([{ event: "delta", data: '{"text":"hi"}' }]);
  });

  it("handles frames split across chunk boundaries", () => {
    const { frames, rest } = LLMParseSSEBuffer('event: meta\n');
    expect(frames).toEqual([]);
    expect(rest).toBe("event: meta\n");
  });

  it("defaults unknown events to message", () => {
    const { frames } = LLMParseSSEBuffer("data: hello\n\n");
    expect(frames).toEqual([{ event: "message", data: "hello" }]);
  });
});

describe("LLMExtractCode", () => {
  it("extracts a complete fenced block with language tag", () => {
    const text = 'Here is the code:\n\n```ts\nconst a = 1;\n```\n\nDone.';
    expect(LLMExtractCode(text)).toBe("const a = 1;");
  });

  it("extracts a fenced block without language tag", () => {
    const text = "```\nline1\nline2\n```";
    expect(LLMExtractCode(text)).toBe("line1\nline2");
  });

  it("returns progressive content while the block is open", () => {
    const text = "Explanation:\n\n```py\ndef f():\n    return 1";
    expect(LLMExtractCode(text)).toBe("def f():\n    return 1");
  });

  it("returns null before any block starts", () => {
    expect(LLMExtractCode("Just an explanation")).toBe(null);
    expect(LLMExtractCode("")).toBe(null);
  });

  it("returns only the first block", () => {
    const text = "```js\na\n```\nmiddle\n```js\nb\n```";
    expect(LLMExtractCode(text)).toBe("a");
  });

  it("keeps multi-line content including empty lines", () => {
    const text = "```ts\nfunction f() {\n\n  return 1;\n}\n```";
    expect(LLMExtractCode(text)).toBe("function f() {\n\n  return 1;\n}");
  });

  it("does not treat the opening fence line as code", () => {
    const text = "```python\nprint('x')\n```";
    expect(LLMExtractCode(text)).toBe("print('x')");
  });
});

describe("LLMExtractProse", () => {
  it("returns text before the fenced block", () => {
    const text = "Short explanation.\n\n```ts\nconst a = 1;\n```\ntrailing";
    expect(LLMExtractProse(text)).toBe("Short explanation.");
  });

  it("returns the whole text when there is no block", () => {
    expect(LLMExtractProse("  Just prose  ")).toBe("Just prose");
  });

  it("returns empty string when text starts with a fence", () => {
    expect(LLMExtractProse("```ts\ncode\n```")).toBe("");
  });
});

describe("LLMContextSummary", () => {
  it("describes whole-file context", () => {
    expect(
      LLMContextSummary({
        file: "src/main.ts",
        contentLength: 4500,
        selection: null,
        historyCount: 0,
      })
    ).toBe("src/main.ts · whole file (4500 chars)");
  });

  it("describes selection context with line range and char counts", () => {
    expect(
      LLMContextSummary({
        file: "src/main.ts",
        contentLength: 4500,
        selection: { content: "const a = 1;", startLine: 10, endLine: 20 },
        historyCount: 0,
      })
    ).toBe("src/main.ts · selection lines 10-20 (12 of 4500 chars)");
  });

  it("includes history length with singular form", () => {
    expect(
      LLMContextSummary({
        file: "a.py",
        contentLength: 10,
        selection: null,
        historyCount: 1,
      })
    ).toBe("a.py · whole file (10 chars) · 1 earlier message");
    expect(
      LLMContextSummary({
        file: "a.py",
        contentLength: 10,
        selection: null,
        historyCount: 4,
      })
    ).toBe("a.py · whole file (10 chars) · 4 earlier messages");
  });
});
