<template>
  <dialog id="quick-open" open @click.self="$emit('close')">
    <div class="quick-open-panel">
      <input
        ref="queryInput"
        v-model="query"
        placeholder="Go to file..."
        @keydown="onKeydown"
      />
      <ul class="quick-open-results">
        <li v-if="results.length === 0" class="quick-open-empty">
          No matching files
        </li>
        <li
          v-for="(path, idx) in results"
          :key="path"
          :class="{ 'quick-open-selected': idx === selectedIndex }"
          @mouseenter="selectedIndex = idx"
          @click="select(path)"
        >
          {{ path }}
        </li>
      </ul>
      <footer class="quick-open-footer">
        <kbd>↑</kbd>/<kbd>↓</kbd> navigate · <kbd>Enter</kbd> open ·
        <kbd>Esc</kbd> close
      </footer>
    </div>
  </dialog>
</template>

<script>
import { FuzzyFilterPaths } from "~~/services/FuzzySearch";

export default {
  name: "QuickOpen",
  props: {
    files: { type: Array, default: () => [] },
  },
  emits: ["select", "close"],
  data() {
    return {
      query: "",
      selectedIndex: 0,
    };
  },
  computed: {
    results() {
      return FuzzyFilterPaths(this.files, this.query.trim(), 100);
    },
  },
  watch: {
    query() {
      this.selectedIndex = 0;
    },
  },
  mounted() {
    if (this.$refs.queryInput) {
      this.$refs.queryInput.focus();
    }
  },
  methods: {
    onKeydown(e) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        this.selectedIndex = Math.min(
          this.selectedIndex + 1,
          this.results.length - 1
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (this.results[this.selectedIndex]) {
          this.select(this.results[this.selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.$emit("close");
      }
    },
    select(path) {
      this.$emit("select", path);
    },
  },
};
</script>

<style scoped>
.quick-open-panel {
  display: flex;
  flex-direction: column;
  width: min(40rem, 90vw);
  max-height: 70vh;
  background: var(--pico-card-background-color, #fff);
  border: 1px solid var(--pico-muted-border-color, #ccc);
  border-radius: var(--radius-default, 8px);
  padding: var(--pad-section);
  gap: var(--gap-inline);
}

.quick-open-results {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
}

.quick-open-results li {
  padding: var(--pad-tight) var(--pad-inline);
  cursor: pointer;
  font-family: monospace;
  font-size: var(--font-meta, 0.75rem);
  border-radius: var(--radius-default, 8px);
}

.quick-open-selected {
  background: var(--pico-secondary-background, rgba(128, 128, 128, 0.15));
}

.quick-open-empty {
  cursor: default;
  opacity: var(--opacity-muted);
}

.quick-open-footer {
  font-size: var(--font-label, 0.65rem);
  opacity: var(--opacity-muted);
}
</style>
