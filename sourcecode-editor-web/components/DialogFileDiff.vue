<template>
  <dialog id="dialog-file-diff" open>
    <article>
      <header>
        <a
          href="#close"
          aria-label="Close"
          class="close"
          v-on:click="clickClose()"
        ></a>
        Diff: {{ title }}
      </header>
      <div class="diff-toolbar">
        <span class="diff-legend"
          ><span class="legend-original">Original</span> /
          <span class="legend-modified">Modified</span></span
        >
        <span class="diff-stats" v-if="!loading">
          <span class="stat-added">+{{ stats.added }}</span>
          <span class="stat-removed">-{{ stats.removed }}</span>
        </span>
      </div>
      <div id="dialog-file-diff-body">
        <Loading v-if="loading" />
        <div v-else class="diff-grid">
          <div class="diff-pane">
            <div
              v-for="(row, idx) in rows"
              :key="'l-' + idx"
              :class="['diff-line', leftClass(row)]"
            >
              <span class="diff-ln">{{ row.leftNumber || "" }}</span>
              <pre class="diff-code">{{ row.leftText }}</pre>
            </div>
          </div>
          <div class="diff-pane">
            <div
              v-for="(row, idx) in rows"
              :key="'r-' + idx"
              :class="['diff-line', rightClass(row)]"
            >
              <span class="diff-ln">{{ row.rightNumber || "" }}</span>
              <pre class="diff-code">{{ row.rightText }}</pre>
            </div>
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

export default {
  components: { Loading },
  props: {
    title: { type: String, default: "" },
    originalContent: { type: String, default: "" },
    modifiedContent: { type: String, default: "" },
    loading: { type: Boolean, default: false },
  },
  computed: {
    rows() {
      return this.computeRows(
        this.originalContent || "",
        this.modifiedContent || "",
      );
    },
    stats() {
      let added = 0;
      let removed = 0;
      for (const r of this.rows) {
        if (r.type === "added") added++;
        if (r.type === "removed") removed++;
      }
      return { added, removed };
    },
  },
  methods: {
    clickClose() {
      this.$emit("onClose", {});
    },
    leftClass(row) {
      if (row.type === "removed") return "diff-removed";
      if (row.type === "added") return "diff-empty";
      return "";
    },
    rightClass(row) {
      if (row.type === "added") return "diff-added";
      if (row.type === "removed") return "diff-empty";
      return "";
    },
    // Compute side-by-side diff rows using LCS over lines.
    computeRows(a, b) {
      const aLines = a.split("\n");
      const bLines = b.split("\n");
      const n = aLines.length;
      const m = bLines.length;
      // LCS table
      const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
      for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
          if (aLines[i] === bLines[j]) {
            dp[i][j] = dp[i + 1][j + 1] + 1;
          } else {
            dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
          }
        }
      }
      const rows = [];
      let i = 0;
      let j = 0;
      let leftNumber = 0;
      let rightNumber = 0;
      while (i < n && j < m) {
        if (aLines[i] === bLines[j]) {
          leftNumber++;
          rightNumber++;
          rows.push({
            type: "equal",
            leftText: aLines[i],
            rightText: bLines[j],
            leftNumber,
            rightNumber,
          });
          i++;
          j++;
        } else if (dp[i + 1][j] >= dp[i][j + 1]) {
          leftNumber++;
          rows.push({
            type: "removed",
            leftText: aLines[i],
            rightText: "",
            leftNumber,
            rightNumber: "",
          });
          i++;
        } else {
          rightNumber++;
          rows.push({
            type: "added",
            leftText: "",
            rightText: bLines[j],
            leftNumber: "",
            rightNumber,
          });
          j++;
        }
      }
      while (i < n) {
        leftNumber++;
        rows.push({
          type: "removed",
          leftText: aLines[i],
          rightText: "",
          leftNumber,
          rightNumber: "",
        });
        i++;
      }
      while (j < m) {
        rightNumber++;
        rows.push({
          type: "added",
          leftText: "",
          rightText: bLines[j],
          leftNumber: "",
          rightNumber,
        });
        j++;
      }
      return rows;
    },
  },
};
</script>

<style scoped>
#dialog-file-diff article {
  min-width: 90dvw;
  height: 90dvh;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
}
#dialog-file-diff-body {
  overflow: auto;
  border: 1px solid var(--pico-muted-border-color, #ccc);
  background: var(--pico-card-background-color, #fff);
}
.diff-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0.5rem;
  font-size: 0.85em;
}
.legend-original {
  color: #b04a4a;
}
.legend-modified {
  color: #3a8a3a;
}
.stat-added {
  color: #3a8a3a;
  margin-right: 0.5em;
}
.stat-removed {
  color: #b04a4a;
}
.diff-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  font-family: monospace;
  font-size: 0.85em;
}
.diff-pane {
  border-right: 1px solid var(--pico-muted-border-color, #ccc);
  overflow-x: auto;
}
.diff-pane:last-child {
  border-right: none;
}
.diff-line {
  display: grid;
  grid-template-columns: 3em 1fr;
  align-items: stretch;
  min-height: 1.4em;
  border-bottom: 1px solid rgba(128, 128, 128, 0.05);
}
.diff-ln {
  text-align: right;
  padding: 0 0.5em;
  color: #888;
  user-select: none;
  background: rgba(128, 128, 128, 0.06);
  border-right: 1px solid rgba(128, 128, 128, 0.15);
}
.diff-code {
  margin: 0;
  padding: 0 0.5em;
  white-space: pre;
  background: transparent;
  font-family: inherit;
  font-size: inherit;
  border: none;
}
.diff-added {
  background: rgba(70, 200, 70, 0.18);
}
.diff-removed {
  background: rgba(220, 80, 80, 0.18);
}
.diff-empty {
  background: rgba(128, 128, 128, 0.08);
}
.action-controls {
  display: flex;
  justify-content: flex-end;
  gap: 0.5em;
  padding-top: 0.5rem;
}
</style>
