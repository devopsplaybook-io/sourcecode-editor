<template>
  <dialog id="dialog-pr-diff" open>
    <article>
      <header>
        <a
          href="#close"
          aria-label="Close"
          class="close"
          v-on:click="clickClose()"
        ></a>
        PR #{{ number }}: {{ title }}
      </header>
      <div class="pr-diff-toolbar">
        <span class="pr-diff-repo">{{ org }}/{{ repo }}</span>
        <span v-if="!loading && stats.added + stats.removed > 0" class="pr-diff-stats">
          <span class="stat-added">+{{ stats.added }}</span>
          <span class="stat-removed">-{{ stats.removed }}</span>
        </span>
      </div>
      <div id="dialog-pr-diff-body">
        <Loading v-if="loading" />
        <div v-else-if="error" class="pr-diff-error">
          <i class="bi bi-x-circle"></i> {{ error }}
        </div>
        <div v-else-if="lines.length === 0" class="pr-diff-empty">
          No diff available for this pull request.
        </div>
        <div v-else class="pr-diff-lines">
          <div
            v-for="(line, idx) in lines"
            :key="idx"
            :class="['pr-diff-line', lineClass(line)]"
          >
            <pre class="pr-diff-code">{{ line }}</pre>
          </div>
        </div>
      </div>
      <div class="action-controls">
        <button @click="clickClose()">Close</button>
      </div>
    </article>
  </dialog>
</template>

<script>
import Loading from "~/components/Loading.vue";
import { GitHubService } from "~~/services/GitHubService";

export default {
  components: { Loading },
  props: {
    org: { type: String, required: true },
    repo: { type: String, required: true },
    number: { type: Number, required: true },
    title: { type: String, default: "" },
  },
  emits: ["onClose"],
  data() {
    return {
      diff: "",
      loading: true,
      error: "",
    };
  },
  computed: {
    lines() {
      return this.diff ? this.diff.split("\n") : [];
    },
    stats() {
      let added = 0;
      let removed = 0;
      for (const line of this.lines) {
        if (line.startsWith("+") && !line.startsWith("+++")) added++;
        if (line.startsWith("-") && !line.startsWith("---")) removed++;
      }
      return { added, removed };
    },
  },
  async mounted() {
    try {
      this.diff = await GitHubService.getPRDiff(
        this.org,
        this.repo,
        this.number,
      );
    } catch (err) {
      this.error =
        (err.response && err.response.data && err.response.data.error) ||
        "Failed to load the pull request diff.";
    } finally {
      this.loading = false;
    }
  },
  methods: {
    clickClose() {
      this.$emit("onClose", {});
    },
    lineClass(line) {
      if (line.startsWith("diff --git") || line.startsWith("index ")) {
        return "pr-diff-meta";
      }
      if (line.startsWith("---") || line.startsWith("+++")) {
        return "pr-diff-meta";
      }
      if (line.startsWith("@@")) {
        return "pr-diff-hunk";
      }
      if (line.startsWith("+")) {
        return "pr-diff-added";
      }
      if (line.startsWith("-")) {
        return "pr-diff-removed";
      }
      return "";
    },
  },
};
</script>

<style scoped>
#dialog-pr-diff article {
  min-width: 90dvw;
  height: 90dvh;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
}
#dialog-pr-diff-body {
  overflow: auto;
  border: 1px solid var(--pico-muted-border-color, #ccc);
  background: var(--pico-card-background-color, #fff);
}
.pr-diff-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0.5rem;
  font-size: 0.85em;
}
.pr-diff-repo {
  opacity: var(--opacity-muted, 0.6);
}
.stat-added {
  color: #3a8a3a;
  margin-right: 0.5em;
}
.stat-removed {
  color: #b04a4a;
}
.pr-diff-lines {
  font-family: monospace;
  font-size: 0.85em;
}
.pr-diff-line {
  min-height: 1.4em;
  border-bottom: 1px solid rgba(128, 128, 128, 0.05);
}
.pr-diff-code {
  margin: 0;
  padding: 0 0.5em;
  white-space: pre;
  background: transparent;
  font-family: inherit;
  font-size: inherit;
  border: none;
}
.pr-diff-added {
  background: rgba(70, 200, 70, 0.18);
}
.pr-diff-removed {
  background: rgba(220, 80, 80, 0.18);
}
.pr-diff-hunk {
  background: rgba(128, 128, 128, 0.08);
  color: #3cabff;
}
.pr-diff-meta {
  opacity: 0.55;
  font-weight: 600;
}
.pr-diff-error {
  padding: 1rem;
  color: var(--pico-del-color, #b04a4a);
}
.pr-diff-empty {
  padding: 1rem;
  opacity: var(--opacity-muted, 0.6);
  font-style: italic;
}
.action-controls {
  display: flex;
  justify-content: flex-end;
  gap: 0.5em;
  padding-top: 0.5rem;
}
</style>
