<template>
  <dialog id="dialog-details" open>
    <article>
      <header>
        <a
          href="#close"
          aria-label="Close"
          class="close"
          v-on:click="clickClose()"
        ></a>
        Commit / Push: {{ project.name }}
      </header>
      <label>Files</label>
      <div
        v-if="
          project.status.filesUpdateStatus &&
          project.status.filesUpdateStatus.length
        "
      >
        <div
          v-for="(file, idx) in project.status.filesUpdateStatus"
          :key="file.path"
          class="commit-file-row"
        >
          <input
            type="checkbox"
            :id="'file-' + idx"
            :value="file.path"
            v-model="selectedFiles"
          />
          <label :for="'file-' + idx" class="commit-file-label"
            >{{ file.path }} <span>[{{ file.state }}]</span></label
          >
          <a
            href="#"
            class="commit-file-action"
            @click.prevent="openDiff(file)"
            title="View Diff"
            ><i class="bi bi-file-diff"></i> Diff</a
          >
          <a
            href="#"
            class="commit-file-action commit-file-discard"
            @click.prevent="discardFile(file)"
            title="Discard changes"
            ><i class="bi bi-x-circle"></i> Discard</a
          >
        </div>
      </div>
      <div v-else>No modified files.</div>
      <label>Commit Message</label>
      <textarea v-model="commitMessage" />
      <div class="action-controls">
        <button @click="selectAll()">Select All</button>
        <button @click="commit()">Commit</button>
        <button @click="reset()">Reset</button>
        <button @click="clickClose()">Cancel</button>
      </div>
    </article>
    <DialogFileDiff
      v-if="showDiff"
      :title="diffFile ? diffFile.path : ''"
      :originalContent="diffOriginalContent"
      :modifiedContent="diffCurrentContent"
      :loading="diffLoading"
      @onClose="closeDiff()"
    />
  </dialog>
</template>

<script>
import axios from "axios";
import Config from "~~/services/Config.ts";
import { handleError, EventBus, EventTypes } from "~~/services/EventBus";
import { AuthService } from "~~/services/AuthService";
import { UtilsDecompressData } from "~~/services/Utils";
import DialogFileDiff from "~/components/DialogFileDiff.vue";

export default {
  components: { DialogFileDiff },
  props: {
    project: null,
  },
  data() {
    return {
      commitMessage: "",
      selectedFiles: [],
      showDiff: false,
      diffFile: null,
      diffOriginalContent: "",
      diffCurrentContent: "",
      diffLoading: false,
    };
  },
  async created() {},
  methods: {
    async clickClose() {
      this.$emit("onClose", {});
    },
    async commit() {
      if (!this.selectedFiles || this.selectedFiles.length === 0) {
        EventBus.emit(EventTypes.ALERT_MESSAGE, {
          type: "error",
          text: "Please select at least one file to commit",
        });
        return;
      }
      if (!this.commitMessage || this.commitMessage.trim().length === 0) {
        EventBus.emit(EventTypes.ALERT_MESSAGE, {
          type: "error",
          text: "Please enter a commit message",
        });
        return;
      }
      axios
        .post(
          `${(await Config.get()).SERVER_URL}/projects/${
            this.project.projectId
          }/operations/commit`,
          {
            files: this.selectedFiles,
            message: this.commitMessage,
          },
          await AuthService.getAuthHeader(),
        )
        .then(async (res) => {
          EventBus.emit(EventTypes.ALERT_MESSAGE, {
            type: "info",
            text: "Committed",
          });
          this.$emit("onClose", {});
        })
        .catch(handleError);
    },
    async reset() {
      if (
        !confirm(
          "Are you sure you want to reset? This will discard all uncommitted changes.",
        )
      ) {
        return;
      }
      axios
        .post(
          `${(await Config.get()).SERVER_URL}/projects/${
            this.project.projectId
          }/operations/reset`,
          {},
          await AuthService.getAuthHeader(),
        )
        .then(async (res) => {
          EventBus.emit(EventTypes.ALERT_MESSAGE, {
            type: "info",
            text: "Reset",
          });
          this.$emit("onClose", {});
        })
        .catch(handleError);
    },
    selectAll() {
      if (
        this.project &&
        this.project.status &&
        this.project.status.filesUpdateStatus
      ) {
        this.selectedFiles = this.project.status.filesUpdateStatus.map(
          (file) => file.path,
        );
      }
    },
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
          await AuthService.getAuthHeader(),
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
      if (!confirm(`Discard changes to ${file.path}? This cannot be undone.`)) {
        return;
      }
      try {
        await axios.post(
          `${(await Config.get()).SERVER_URL}/projects/${
            this.project.projectId
          }/operations/discard`,
          { file: file.path },
          await AuthService.getAuthHeader(),
        );
        EventBus.emit(EventTypes.ALERT_MESSAGE, {
          type: "info",
          text: `Discarded changes: ${file.path}`,
        });
        // Remove file from selection if present and from local list (status will be refreshed via events).
        this.selectedFiles = this.selectedFiles.filter((p) => p !== file.path);
        if (
          this.project &&
          this.project.status &&
          Array.isArray(this.project.status.filesUpdateStatus)
        ) {
          this.project.status.filesUpdateStatus =
            this.project.status.filesUpdateStatus.filter(
              (f) => f.path !== file.path,
            );
        }
        // If no more pending changes, dismiss the commit dialog.
        if (
          !this.project.status.filesUpdateStatus ||
          this.project.status.filesUpdateStatus.length === 0
        ) {
          this.$emit("onClose", {});
        }
      } catch (e) {
        handleError(e);
      }
    },
  },
};
</script>

<style scoped>
#dialog-details article {
  min-width: 90dvw;
  height: 90dvh;
  display: grid;
  grid-template-rows: auto 1fr;
}
#dialog-details-text {
  overflow: auto;
}
.commit-file-row {
  display: flex;
  align-items: center;
  gap: var(--gap-inline);
  padding: 0.15em 0;
}
.commit-file-label {
  flex: 1;
  margin: 0;
}
.commit-file-action {
  cursor: pointer;
  text-decoration: none;
  font-size: var(--font-icon);
  white-space: nowrap;
}
.commit-file-discard {
  color: #b04a4a;
}
</style>
