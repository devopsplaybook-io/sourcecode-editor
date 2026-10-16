<template>
  <div id="changed-files-panel">
    <div class="changed-files-header">
      <strong>Changed files</strong>
      <button
        class="changed-files-commit"
        :disabled="changedFiles.length === 0"
        title="Commit and push changed files"
        @click="$emit('open-commit')"
      >
        Commit / Push
      </button>
    </div>
    <div v-if="changedFiles.length" class="changed-files-list">
      <div
        v-for="file in changedFiles"
        :key="file.path"
        class="changed-file-row"
      >
        <span class="changed-file-path" :title="file.path">{{
          file.path
        }}</span>
        <span class="changed-file-state">[{{ file.state }}]</span>
        <a
          href="#"
          class="changed-file-action"
          title="View diff"
          @click.prevent="openDiff(file)"
          ><i class="bi bi-file-diff"></i
        ></a>
        <a
          href="#"
          class="changed-file-action changed-file-discard"
          title="Discard changes"
          @click.prevent="discardFile(file)"
          ><i class="bi bi-x-circle"></i
        ></a>
      </div>
    </div>
    <p v-else class="changed-files-empty">No uncommitted changes.</p>
    <DialogFileDiff
      v-if="showDiff"
      :title="diffFile ? diffFile.path : ''"
      :originalContent="diffOriginalContent"
      :modifiedContent="diffCurrentContent"
      :loading="diffLoading"
      @onClose="closeDiff()"
    />
  </div>
</template>

<script>
import axios from "axios";
import Config from "~~/services/Config.ts";
import { EventBus, EventTypes, handleError } from "~~/services/EventBus";
import { AuthService } from "~~/services/AuthService";
import { UtilsDecompressData } from "~~/services/Utils";
import DialogFileDiff from "~/components/DialogFileDiff.vue";

export default {
  name: "ChangedFilesPanel",
  components: { DialogFileDiff },
  props: {
    project: { type: Object, default: null },
  },
  emits: ["open-commit"],
  data() {
    return {
      showDiff: false,
      diffFile: null,
      diffOriginalContent: "",
      diffCurrentContent: "",
      diffLoading: false,
    };
  },
  computed: {
    changedFiles() {
      return (
        (this.project &&
          this.project.status &&
          this.project.status.filesUpdateStatus) ||
        []
      );
    },
  },
  methods: {
    async openDiff(file) {
      this.diffFile = file;
      this.diffOriginalContent = "";
      this.diffCurrentContent = "";
      this.diffLoading = true;
      this.showDiff = true;
      try {
        const res = await axios.post(
          `${(await Config.get()).SERVER_URL}/projects/${
            this.project.projectId
          }/files/diff`,
          { file: file.path },
          await AuthService.getAuthHeader()
        );
        const data = JSON.parse(await UtilsDecompressData(res.data.diff));
        this.diffOriginalContent = data.originalContent || "";
        this.diffCurrentContent = data.currentContent || "";
      } catch (e) {
        handleError(e);
        this.showDiff = false;
      }
      this.diffLoading = false;
    },
    closeDiff() {
      this.showDiff = false;
      this.diffFile = null;
      this.diffOriginalContent = "";
      this.diffCurrentContent = "";
    },
    async discardFile(file) {
      if (
        !confirm(`Discard changes to ${file.path}? This cannot be undone.`)
      ) {
        return;
      }
      try {
        await axios.post(
          `${(await Config.get()).SERVER_URL}/projects/${
            this.project.projectId
          }/operations/discard`,
          { file: file.path },
          await AuthService.getAuthHeader()
        );
        EventBus.emit(EventTypes.ALERT_MESSAGE, {
          type: "info",
          text: `Discarded changes: ${file.path}`,
        });
        // The git.status.changed event refreshes project.status reactively.
      } catch (e) {
        handleError(e);
      }
    },
  },
};
</script>

<style scoped>
#changed-files-panel {
  display: flex;
  flex-direction: column;
  gap: var(--gap-inline);
  overflow: auto;
  height: 100%;
  padding: var(--pad-tight) var(--pad-inline);
  font-size: var(--font-meta, 0.75rem);
}

.changed-files-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--gap-inline);
}

.changed-files-commit {
  font-size: var(--font-label, 0.65rem);
  padding: var(--pad-button-sm);
  margin: 0;
  white-space: nowrap;
}

.changed-files-list {
  display: flex;
  flex-direction: column;
  gap: var(--gap-tight);
}

.changed-file-row {
  display: flex;
  align-items: center;
  gap: var(--gap-tight);
}

.changed-file-path {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: monospace;
}

.changed-file-state {
  opacity: var(--opacity-muted);
  white-space: nowrap;
}

.changed-file-action {
  cursor: pointer;
  text-decoration: none;
  font-size: var(--font-icon, 0.9rem);
}

.changed-file-discard {
  color: #b04a4a;
}

.changed-files-empty {
  opacity: var(--opacity-muted);
  margin: 0;
}
</style>
