<template>
  <div ref="editorContainer" class="code-editor"></div>
</template>

<script>
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { yaml } from "@codemirror/lang-yaml";
import { oneDark } from "@codemirror/theme-one-dark";

export default {
  name: "CodeEditor",
  props: {
    content: { type: String, default: "" },
    languagePath: { type: String, default: "" },
    gotoLine: { type: Number, default: null },
  },
  emits: ["change", "goto-line-done"],
  data() {
    return {
      view: null,
      themeCompartment: new Compartment(),
      languageCompartment: new Compartment(),
      themeObserver: null,
    };
  },
  watch: {
    content(newContent) {
      if (!this.view) return;
      const currentDoc = this.view.state.doc.toString();
      if (newContent !== currentDoc) {
        this.view.dispatch({
          changes: {
            from: 0,
            to: currentDoc.length,
            insert: newContent,
          },
        });
      }
    },
    languagePath(newPath) {
      if (!this.view) return;
      this.view.dispatch({
        effects: this.languageCompartment.reconfigure(
          this.languageExtensionFor(newPath)
        ),
      });
    },
    gotoLine(line) {
      if (line == null || !this.view) return;
      const totalLines = this.view.state.doc.lines;
      const targetLine = this.view.state.doc.line(
        Math.min(Math.max(1, line), totalLines)
      );
      this.view.dispatch({
        selection: { anchor: targetLine.from },
        effects: EditorView.scrollIntoView(targetLine.from, { y: "center" }),
      });
      this.view.focus();
      this.$emit("goto-line-done");
    },
  },
  mounted() {
    this.view = new EditorView({
      state: EditorState.create({
        doc: this.content,
        extensions: [
          basicSetup,
          this.themeCompartment.of(this.currentThemeExtension()),
          this.languageCompartment.of(
            this.languageExtensionFor(this.languagePath)
          ),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              this.$emit("change", update.state.doc.toString());
            }
          }),
        ],
      }),
      parent: this.$refs.editorContainer,
    });
    this.themeObserver = new MutationObserver(() => {
      if (!this.view) return;
      this.view.dispatch({
        effects: this.themeCompartment.reconfigure(
          this.currentThemeExtension()
        ),
      });
    });
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  },
  beforeUnmount() {
    if (this.themeObserver) {
      this.themeObserver.disconnect();
      this.themeObserver = null;
    }
    if (this.view) {
      this.view.destroy();
      this.view = null;
    }
  },
  methods: {
    currentThemeExtension() {
      const isDark =
        document.documentElement.getAttribute("data-theme") === "dark";
      return isDark ? oneDark : [];
    },
    languageExtensionFor(path) {
      const extension = (path.split(".").pop() || "").toLowerCase();
      switch (extension) {
        case "js":
        case "mjs":
        case "cjs":
          return javascript();
        case "jsx":
          return javascript({ jsx: true });
        case "ts":
        case "mts":
        case "cts":
          return javascript({ typescript: true });
        case "tsx":
          return javascript({ typescript: true, jsx: true });
        case "json":
          return json();
        case "html":
        case "htm":
        case "vue":
        case "svelte":
          return html();
        case "css":
          return css();
        case "md":
        case "markdown":
          return markdown();
        case "py":
          return python();
        case "yml":
        case "yaml":
          return yaml();
        default:
          return [];
      }
    },
  },
};
</script>

<style scoped>
.code-editor {
  height: 100%;
  min-height: 200px;
  overflow: hidden;
  border: 1px solid var(--pico-muted-border-color, #ccc);
  border-radius: var(--radius-default, 8px);
}

.code-editor :deep(.cm-editor) {
  height: 100%;
}

.code-editor :deep(.cm-scroller) {
  overflow: auto;
  font-family: monospace;
  line-height: 1.5;
}
</style>
