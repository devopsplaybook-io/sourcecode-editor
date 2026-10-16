<template>
  <dialog id="search-panel" open @click.self="$emit('close')">
    <div class="search-panel-box">
      <header class="search-panel-header">
        <strong>Search in project</strong>
        <a
          href="#close"
          aria-label="Close"
          class="close"
          @click.prevent="$emit('close')"
        ></a>
      </header>
      <input
        ref="queryInput"
        v-model="query"
        placeholder="Search text across all project files..."
        @keydown.esc="$emit('close')"
      />
      <div class="search-results">
        <Loading v-if="searching" />
        <p v-else-if="results.length === 0" class="search-empty">
          {{
            searched
              ? "No matches found."
              : "Type to search across all project files."
          }}
        </p>
        <ul v-else class="search-results-list">
          <li
            v-for="match in results"
            :key="match.path + ':' + match.line"
            @click="$emit('open', match)"
          >
            <span class="search-result-path"
              >{{ match.path }}:{{ match.line }}</span
            >
            <span class="search-result-text">{{ match.text }}</span>
          </li>
        </ul>
      </div>
      <footer v-if="results.length" class="search-panel-footer">
        {{ results.length }} match(es){{
          results.length >= 200 ? " (limit reached)" : ""
        }}
      </footer>
    </div>
  </dialog>
</template>

<script>
import axios from "axios";
import Config from "~~/services/Config.ts";
import { AuthService } from "~~/services/AuthService";
import { handleError } from "~~/services/EventBus";
import debounce from "lodash/debounce";
import Loading from "~/components/Loading.vue";

export default {
  name: "SearchPanel",
  components: { Loading },
  props: {
    projectId: { type: String, required: true },
  },
  emits: ["open", "close"],
  data() {
    return {
      query: "",
      results: [],
      searching: false,
      searched: false,
      searchRequestId: 0,
    };
  },
  watch: {
    query() {
      this.debouncedSearch();
    },
  },
  created() {
    this.debouncedSearch = debounce(this.search, 300);
  },
  beforeUnmount() {
    if (this.debouncedSearch) {
      this.debouncedSearch.cancel();
    }
  },
  mounted() {
    if (this.$refs.queryInput) {
      this.$refs.queryInput.focus();
    }
  },
  methods: {
    async search() {
      const trimmed = this.query.trim();
      const requestId = ++this.searchRequestId;
      if (!trimmed) {
        this.results = [];
        this.searched = false;
        this.searching = false;
        return;
      }
      this.searching = true;
      try {
        const res = await axios.post(
          `${(await Config.get()).SERVER_URL}/projects/${
            this.projectId
          }/files/search`,
          { query: trimmed },
          await AuthService.getAuthHeader()
        );
        if (requestId !== this.searchRequestId) return;
        this.results = res.data.matches || [];
        this.searched = true;
      } catch (e) {
        if (requestId !== this.searchRequestId) return;
        handleError(e);
        this.results = [];
        this.searched = true;
      } finally {
        if (requestId === this.searchRequestId) {
          this.searching = false;
        }
      }
    },
  },
};
</script>

<style scoped>
.search-panel-box {
  display: flex;
  flex-direction: column;
  gap: var(--gap-inline);
  width: min(50rem, 90vw);
  height: min(45rem, 80vh);
  background: var(--pico-card-background-color, #fff);
  border: 1px solid var(--pico-muted-border-color, #ccc);
  border-radius: var(--radius-default, 8px);
  padding: var(--pad-section);
}

.search-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.search-results {
  flex: 1;
  overflow-y: auto;
}

.search-results-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.search-results-list li {
  display: flex;
  gap: var(--gap-inline);
  padding: var(--pad-tight) var(--pad-inline);
  cursor: pointer;
  font-family: monospace;
  font-size: var(--font-meta, 0.75rem);
  border-radius: var(--radius-default, 8px);
}

.search-results-list li:hover {
  background: var(--pico-secondary-background, rgba(128, 128, 128, 0.15));
}

.search-result-path {
  white-space: nowrap;
  font-weight: bold;
}

.search-result-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: var(--opacity-muted);
}

.search-empty {
  opacity: var(--opacity-muted);
  text-align: center;
  padding: var(--pad-page);
}

.search-panel-footer {
  font-size: var(--font-label, 0.65rem);
  opacity: var(--opacity-muted);
}
</style>
