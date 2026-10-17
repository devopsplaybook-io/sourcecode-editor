<template>
  <div>
    <dialog id="dialog-history" open>
      <article>
        <header>
          <a
            href="#close"
            aria-label="Close"
            class="close"
            v-on:click="clickClose()"
          ></a>
          History: {{ project.name }}
        </header>
        <section class="history-controls">
          <label>Commits</label>
          <select v-model.number="limit" @change="fetchHistory()">
            <option :value="10">10</option>
            <option :value="30">30</option>
            <option :value="100">100</option>
          </select>
          <span class="actions"
            ><i class="bi bi-arrow-clockwise" @click="fetchHistory()"></i
          ></span>
        </section>
        <div class="history-list">
          <Loading v-if="loadingHistory" />
          <div v-else-if="commits.length === 0" class="history-empty">
            No commits found.
          </div>
          <div
            v-for="commit in commits"
            :key="commit.hash"
            class="history-commit"
          >
            <a
              href="#"
              class="history-commit-summary"
              @click.prevent="toggleCommitFiles(commit)"
            >
              <span class="history-hash">{{ commit.hash.slice(0, 8) }}</span>
              <span class="history-message">{{ commit.message }}</span>
              <span class="history-meta"
                >{{ commit.author }} · {{ formatDate(commit.date) }}</span
              >
            </a>
            <div
              v-if="expandedHash === commit.hash"
              class="history-files"
            >
              <Loading v-if="loadingFiles" />
              <div v-else-if="files.length === 0" class="history-empty">
                No files changed in this commit.
              </div>
              <a
                v-for="file in files"
                :key="file.path"
                href="#"
                class="history-file-row"
                @click.prevent="openFileAtRevision(file)"
              >
                {{ file.path }}
                <span class="history-file-state">[{{ file.state }}]</span>
              </a>
            </div>
          </div>
        </div>
      </article>
      <DialogDetails
        v-if="showFile"
        :title="fileDialogTitle"
        :text="fileContent"
        @onClose="closeFile()"
      />
    </dialog>
  </div>
</template>

<script>
import axios from "axios";
import Config from "~~/services/Config.ts";
import { handleError } from "~~/services/EventBus";
import { AuthService } from "~~/services/AuthService";
import { UtilsDecompressData, UtilsRelativeTime } from "~~/services/Utils";
import DialogDetails from "~/components/DialogDetails.vue";
import Loading from "~/components/Loading.vue";

export default {
  components: { DialogDetails, Loading },
  props: {
    project: null,
  },
  data() {
    return {
      limit: 30,
      loadingHistory: false,
      commits: [],
      expandedHash: null,
      files: [],
      loadingFiles: false,
      showFile: false,
      selectedFile: null,
      fileContent: "",
    };
  },
  computed: {
    fileDialogTitle() {
      const file = this.selectedFile ? this.selectedFile.path : "";
      const revision = this.expandedHash
        ? this.expandedHash.slice(0, 8)
        : "";
      return `${file} @ ${revision}`;
    },
  },
  async created() {
    await this.fetchHistory();
  },
  methods: {
    formatDate(date) {
      return UtilsRelativeTime(date);
    },
    async clickClose() {
      this.$emit("onClose", {});
    },
    async fetchHistory() {
      this.loadingHistory = true;
      try {
        const res = await axios.get(
          `${(await Config.get()).SERVER_URL}/projects/${
            this.project.projectId
          }/operations/log?limit=${this.limit}`,
          await AuthService.getAuthHeader(),
        );
        this.commits = res.data.commits || [];
      } catch (e) {
        handleError(e);
      }
      this.loadingHistory = false;
    },
    async toggleCommitFiles(commit) {
      if (this.expandedHash === commit.hash) {
        this.expandedHash = null;
        this.files = [];
        return;
      }
      this.expandedHash = commit.hash;
      this.files = [];
      this.loadingFiles = true;
      try {
        const res = await axios.get(
          `${(await Config.get()).SERVER_URL}/projects/${
            this.project.projectId
          }/operations/commit/${commit.hash}/files`,
          await AuthService.getAuthHeader(),
        );
        this.files = res.data.files || [];
      } catch (e) {
        handleError(e);
      }
      this.loadingFiles = false;
    },
    async openFileAtRevision(file) {
      this.selectedFile = file;
      this.fileContent = "Loading...";
      this.showFile = true;
      try {
        const res = await axios.post(
          `${(await Config.get()).SERVER_URL}/projects/${
            this.project.projectId
          }/operations/file-at-revision`,
          { hash: this.expandedHash, file: file.path },
          await AuthService.getAuthHeader(),
        );
        const data = JSON.parse(await UtilsDecompressData(res.data.file));
        this.fileContent = data.content || "";
      } catch (e) {
        handleError(e);
        this.showFile = false;
      }
    },
    closeFile() {
      this.showFile = false;
      this.selectedFile = null;
      this.fileContent = "";
    },
  },
};
</script>

<style scoped>
#dialog-history article {
  min-width: 70dvw;
  max-width: 90dvw;
  height: 80dvh;
  display: grid;
  grid-template-rows: auto 1fr;
}
.history-controls {
  display: grid;
  grid-template-columns: auto auto 1fr;
  grid-gap: 1rem;
  align-items: center;
  margin: 0;
  margin-bottom: 1rem;
}
.history-controls label {
  margin: 0;
}
.history-controls select {
  margin: 0;
}
.history-controls .actions {
  justify-self: end;
}
.history-list {
  overflow: auto;
}
.history-empty {
  opacity: 0.7;
  padding: 0.5em 0;
}
.history-commit {
  border-bottom: 1px solid var(--pico-muted-border-color, #ccc);
}
.history-commit-summary {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-gap: var(--gap-inline);
  align-items: baseline;
  padding: 0.4em 0;
  text-decoration: none;
  color: inherit;
}
.history-hash {
  font-family: monospace;
  font-size: var(--font-icon);
}
.history-message {
  font-weight: 500;
}
.history-meta {
  font-size: var(--font-icon);
  opacity: 0.7;
  white-space: nowrap;
}
.history-files {
  padding: 0 0 0.5em 1.5em;
}
.history-file-row {
  display: inline-block;
  margin: 0.1em 0;
  font-size: var(--font-icon);
  text-decoration: none;
}
.history-file-row:hover {
  text-decoration: underline;
}
.history-file-state {
  opacity: 0.7;
}
</style>
