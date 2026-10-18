export type LLMPresetId = "explain" | "refactor" | "tests" | "fix" | "custom";

export interface LLMSelectionContext {
  content: string;
  startLine: number;
  endLine: number;
}

export interface LLMContext {
  action: LLMPresetId;
  file: string;
  content: string;
  selection: LLMSelectionContext | null;
  prompt: string;
}

export interface LLMMessage {
  role: string;
  content: string;
}

export const LLMPresetIds: LLMPresetId[] = [
  "explain",
  "refactor",
  "tests",
  "fix",
  "custom",
];

export function LLMPresetExists(id: string): boolean {
  return LLMPresetIds.includes(id as LLMPresetId);
}

export function LLMPresetModifiesCode(id: LLMPresetId): boolean {
  return id !== "explain";
}

const LLM_PRESET_INSTRUCTIONS: Record<LLMPresetId, string> = {
  explain:
    "Explain what this code does, its structure and any notable behavior.",
  refactor:
    "Refactor this code to improve clarity, structure and maintainability while preserving its behavior.",
  tests:
    "Add unit tests for this code, following the conventions used in the file.",
  fix: "Find and fix problems in this code (bugs, errors, edge cases).",
  custom: "",
};

const LLM_OUTPUT_PROSE_ONLY =
  "Respond with a clear explanation in plain prose. " +
  "You may include short inline code snippets when helpful. " +
  "Do not rewrite the whole code.";

const LLM_OUTPUT_MODIFYING =
  "Respond with a very short explanation of the change, followed by exactly ONE fenced code block containing the FULL updated file content. " +
  "The code block must include the entire file with all unchanged parts, so it can directly replace the original file. " +
  "Do not omit any part of the file and do not add text after the code block.";

export function LLMSystemPrompt(action: LLMPresetId): string {
  const base =
    "You are a coding assistant embedded in a source code editor. " +
    "You help the user understand and improve their code.";
  const output = LLMPresetModifiesCode(action)
    ? LLM_OUTPUT_MODIFYING
    : LLM_OUTPUT_PROSE_ONLY;
  return `${base} ${output}`;
}

export function LLMContextMessage(context: LLMContext): string {
  const instruction =
    context.action === "custom"
      ? context.prompt
      : LLM_PRESET_INSTRUCTIONS[context.action];
  const parts: string[] = [`File: ${context.file}`];
  if (context.selection) {
    parts.push(
      `The user selected lines ${context.selection.startLine}-${context.selection.endLine}. ` +
        "Apply the request only to the selected lines; return the full file with the rest unchanged."
    );
    parts.push(`Full file content:\n\n${context.content}`);
    parts.push(
      `Selected lines (${context.selection.startLine}-${context.selection.endLine}):\n\n${context.selection.content}`
    );
  } else {
    parts.push(`File content:\n\n${context.content}`);
  }
  parts.push(instruction);
  return parts.join("\n\n");
}

export function LLMBuildMessages(
  context: LLMContext,
  history: LLMMessage[]
): LLMMessage[] {
  const messages: LLMMessage[] = [
    { role: "system", content: LLMSystemPrompt(context.action) },
  ];
  for (const entry of history.slice(-10)) {
    if (
      entry &&
      (entry.role === "user" || entry.role === "assistant") &&
      typeof entry.content === "string" &&
      entry.content
    ) {
      messages.push({ role: entry.role, content: entry.content });
    }
  }
  messages.push({ role: "user", content: LLMContextMessage(context) });
  return messages;
}
