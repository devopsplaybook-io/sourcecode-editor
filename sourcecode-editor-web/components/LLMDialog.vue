<template>
  <dialog open id="llm-dialog">
    <article>
      <header>LLM Assistant: {{ fileName || file }}</header>
      <section id="llm-dialog-body">
        <details id="llm-context" :open="!messages.length">
          <summary>Context sent</summary>
          <p id="llm-context-summary">{{ contextSummary }}</p>
        </details>
        <div id="llm-messages" ref="messageList">
          <div
            v-for="(message, index) in messages"
            :key="index"
            :class="['llm-message', 'llm-message-' + message.role]"
          >
            <span class="llm-message-author">{{
              message.role === "user" ? "You" : "Assistant"
            }}</span>
            <pre v-if="message.role === 'user'" class="llm-prose">{{
              message.content
            }}</pre>
            <template v-else>
              <pre v-if="assistantProse(message)" class="llm-prose">{{
                assistantProse(message)
              }}</pre>
              <div v-if="assistantCode(message) !== null" class="llm-code-block">
                <div class="llm-code-label">
                  {{
                    streaming && isLastMessage(index)
                      ? "Code (streaming…)"
                      : "Code"
                  }}
                </div>
                <pre class="llm-code">{{ assistantCode(message) }}</pre>
              </div>
              <p v-if="message.error" class="llm-error">
                <i class="bi bi-exclamation-triangle"></i> {{ message.error }}
              </p>
            </template>
          </div>
          <div v-if="streaming" class="llm-streaming-status">
            <Loading />
            <span>Streaming… {{ elapsedSeconds }}s</span>
          </div>
          <div v-if="!messages.length && !streaming" class="llm-empty">
            Ask about <strong>{{ fileName || file }}</strong> or pick an action
            below.
          </div>
        </div>
        <div v-if="!streaming" id="llm-presets">
          <button
            v-for="preset in presets"
            :key="preset.id"
            class="llm-preset-button"
            @click="runPreset(preset)"
          >
            <i :class="'bi ' + preset.icon"></i> {{ preset.label }}
          </button>
        </div>
        <div v-if="!streaming" id="llm-custom-row">
          <textarea
            v-model="prompt"
            rows="2"
            placeholder="Or type a custom instruction for this file…"
            @keydown.enter.exact.prevent="sendCustom"
          ></textarea>
          <button @click="sendCustom" :disabled="!prompt.trim()">Send</button>
        </div>
      </section>
      <footer>
        <span id="llm-status">{{ statusText }}</span>
        <span id="llm-actions">
          <button v-if="canRetry" @click="retry">Retry</button>
          <button v-if="canAccept" @click="showDiff = true">View Diff</button>
          <button v-if="canAccept" @click="acceptCode">Accept</button>
          <button
            v-if="messages.length && !streaming"
            @click="clearConversation"
          >
            Clear conversation
          </button>
          <button @click="cancelOrClose">{{ streaming ? "Stop" : "Close" }}</button>
        </span>
      </footer>
    </article>
    <DialogFileDiff
      v-if="showDiff"
      :title="fileName || file"
      :originalContent="originalContent"
      :modifiedContent="proposedCode"
      @onClose="showDiff = false"
    />
  </dialog>
</template>

<script>
import {
  LLMChatStream,
  LLMPresetList,
  LLMContextSummary,
  LLMExtractCode,
  LLMExtractProse,
} from "~~/services/LLMAssistant";
import Loading from "~/components/Loading.vue";
import DialogFileDiff from "~/components/DialogFileDiff.vue";

export default {
  components: { Loading, DialogFileDiff },
  props: {
    file: String,
    fileName: String,
    projectId: String,
    originalContent: { type: String, default: "" },
    content: { type: String, default: "" },
    selection: { type: Object, default: null },
    history: { type: Array, default: null },
  },
  data() {
    return {
      prompt: "",
      messages: [],
      streaming: false,
      elapsedSeconds: 0,
      model: "",
      lastLatencyMs: null,
      lastActionModifies: false,
      lastPayload: null,
      showDiff: false,
    };
  },
  computed: {
    presets() {
      return LLMPresetList;
    },
    contextSummary() {
      return LLMContextSummary({
        file: this.fileName || this.file,
        contentLength: (this.content || "").length,
        selection: this.selection,
        historyCount: (this.history || []).length,
      });
    },
    lastTurn() {
      return this.messages.length
        ? this.messages[this.messages.length - 1]
        : null;
    },
    proposedCode() {
      const assistantTurn = [...this.messages]
        .reverse()
        .find((message) => message.role === "assistant");
      return assistantTurn ? LLMExtractCode(assistantTurn.content) : null;
    },
    canAccept() {
      return !this.streaming && this.lastActionModifies && !!this.proposedCode;
    },
    canRetry() {
      return (
        !this.streaming &&
        !!this.lastPayload &&
        !!this.lastTurn &&
        this.lastTurn.role === "assistant" &&
        !!this.lastTurn.error
      );
    },
    statusText() {
      if (this.streaming) {
        return `Model: ${this.model || "…"} · streaming ${this.elapsedSeconds}s`;
      }
      if (this.lastLatencyMs) {
        return `Model: ${this.model} · last response in ${(
          this.lastLatencyMs / 1000
        ).toFixed(1)}s`;
      }
      return this.model ? `Model: ${this.model}` : "";
    },
  },
  created() {
    this.messages = (this.history || []).map((message) => ({ ...message }));
    this.abortController = null;
    this.elapsedTimer = null;
  },
  beforeUnmount() {
    if (this.elapsedTimer) {
      clearInterval(this.elapsedTimer);
      this.elapsedTimer = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  },
  methods: {
    assistantCode(message) {
      return message.role === "assistant"
        ? LLMExtractCode(message.content)
        : null;
    },
    assistantProse(message) {
      return message.role === "assistant"
        ? LLMExtractProse(message.content)
        : "";
    },
    isLastMessage(index) {
      return index === this.messages.length - 1;
    },
    runPreset(preset) {
      this.runAction(preset.id, preset.label);
    },
    sendCustom() {
      if (this.streaming || !this.prompt.trim()) return;
      this.runAction("custom", this.prompt.trim());
    },
    runAction(action, displayText, existingPayload) {
      if (this.streaming) return;
      const preset = this.presets.find((p) => p.id === action);
      this.lastActionModifies = action === "custom" || (preset ? preset.modifiesCode : false);
      const payload = existingPayload || {
        projectId: this.projectId,
        action,
        prompt: action === "custom" ? this.prompt.trim() : "",
        file: this.file,
        content: this.content,
        selection: this.selection,
        history: (this.history || []).slice(-10),
      };
      this.lastPayload = { action, displayText, payload };
      if (!existingPayload) {
        this.prompt = "";
      }
      this.streamResponse(payload, displayText);
    },
    retry() {
      if (!this.canRetry) return;
      const { action, displayText, payload } = this.lastPayload;
      this.messages.pop();
      this.messages.pop();
      this.runAction(action, displayText, payload);
    },
    async streamResponse(payload, displayText) {
      this.streaming = true;
      this.elapsedSeconds = 0;
      this.abortController = new AbortController();
      this.elapsedTimer = setInterval(() => {
        this.elapsedSeconds++;
      }, 1000);
      this.messages.push({ role: "user", content: displayText });
      this.messages.push({ role: "assistant", content: "" });
      // Resolve through this.messages so mutations hit the reactive proxy.
      const turn = this.messages[this.messages.length - 1];
      const historyBefore = [...(this.history || [])];
      this.scrollToBottom();
      try {
        await LLMChatStream(
          payload,
          {
            onMeta: (meta) => {
              if (meta && meta.model) {
                this.model = meta.model;
              }
            },
            onDelta: (text) => {
              turn.content += text;
              this.scrollToBottom();
            },
            onDone: (result) => {
              this.lastLatencyMs = result && result.latencyMs ? result.latencyMs : null;
            },
            onError: (message) => {
              turn.error = message;
            },
          },
          this.abortController.signal
        );
      } finally {
        clearInterval(this.elapsedTimer);
        this.elapsedTimer = null;
        this.streaming = false;
      }
      if (!turn.error) {
        if (this.abortController.signal.aborted) {
          turn.error = "Stopped";
        } else if (!turn.content) {
          turn.error = "No response from the model";
        }
      }
      if (!turn.error) {
        this.$emit("history-updated", [
          ...historyBefore,
          { role: "user", content: displayText },
          { role: "assistant", content: turn.content },
        ]);
      }
      this.scrollToBottom();
    },
    acceptCode() {
      if (!this.canAccept) return;
      this.$emit("codeUpdated", this.proposedCode);
    },
    clearConversation() {
      this.messages = [];
      this.lastPayload = null;
      this.lastLatencyMs = null;
      this.lastActionModifies = false;
      this.$emit("history-updated", []);
    },
    cancelOrClose() {
      if (this.streaming) {
        if (this.abortController) {
          this.abortController.abort();
        }
        return;
      }
      this.$emit("close");
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const list = this.$refs.messageList;
        if (list) {
          list.scrollTop = list.scrollHeight;
        }
      });
    },
  },
};
</script>

<style scoped>
#llm-dialog article {
  width: min(92dvw, 860px);
  max-height: 92dvh;
}

#llm-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 0.75em;
  min-height: 240px;
}

#llm-context summary {
  cursor: pointer;
  font-size: 0.85em;
  opacity: 0.8;
}

#llm-context-summary {
  font-size: 0.85em;
  opacity: 0.8;
  margin: 0.25em 0 0;
}

#llm-messages {
  display: flex;
  flex-direction: column;
  gap: 0.75em;
  max-height: 40dvh;
  overflow-y: auto;
  padding-right: 0.25em;
}

.llm-message {
  border: 1px solid var(--pico-muted-border-color, #ccc);
  border-radius: var(--radius-default, 8px);
  padding: 0.5em 0.75em;
}

.llm-message-user {
  background: var(--pico-secondary-background, rgba(0, 0, 0, 0.04));
}

.llm-message-author {
  display: block;
  font-size: 0.75em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.7;
  margin-bottom: 0.25em;
}

.llm-prose {
  white-space: pre-wrap;
  margin: 0;
  font-family: inherit;
  font-size: 0.9em;
  background: transparent;
  border: none;
  padding: 0;
}

.llm-code-block {
  margin-top: 0.5em;
}

.llm-code-label {
  font-size: 0.75em;
  opacity: 0.7;
  margin-bottom: 0.25em;
}

.llm-code {
  margin: 0;
  background: var(--pico-card-background-color, #fff);
  border: 1px solid var(--pico-muted-border-color, #ccc);
  border-radius: var(--radius-default, 8px);
  padding: 0.5em 0.75em;
  font-size: 0.85em;
  max-height: 30dvh;
  overflow: auto;
}

.llm-error {
  color: #b04a4a;
  margin: 0.25em 0 0;
  font-size: 0.9em;
}

.llm-streaming-status {
  display: flex;
  align-items: center;
  gap: 0.5em;
  opacity: 0.8;
}

.llm-empty {
  opacity: var(--opacity-muted, 0.6);
  text-align: center;
  padding: 1em;
}

#llm-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em;
}

.llm-preset-button {
  font-size: 0.85em;
}

#llm-custom-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.5em;
  align-items: end;
}

#llm-custom-row textarea {
  margin: 0;
}

#llm-dialog footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5em;
  flex-wrap: wrap;
}

#llm-actions {
  display: flex;
  gap: 0.5em;
  flex-wrap: wrap;
}

#llm-status {
  font-size: 0.8em;
  opacity: 0.7;
}
</style>
