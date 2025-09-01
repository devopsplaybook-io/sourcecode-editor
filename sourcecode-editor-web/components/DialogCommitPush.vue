<template>
  <div>
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
          >
            <input
              type="checkbox"
              :id="'file-' + idx"
              :value="file.path"
              v-model="selectedFiles"
            />
            <label :for="'file-' + idx"
              >{{ file.path }} <span>[{{ file.state }}]</span></label
            >
          </div>
        </div>
        <div v-else>No modified files.</div>
        <label>Commit Message</label>
        <textarea v-model="commitMessage" />
        <div class="project-controls">
          <button @click="selectAll()">Select All</button>
          <button @click="commit()">Commit</button>
          <button @click="push()">Push</button>
        </div>
      </article>
    </dialog>
  </div>
</template>

<script>
import axios from "axios";
import Config from "~~/services/Config.ts";
import { handleError, EventBus, EventTypes } from "~~/services/EventBus";
import { AuthService } from "~~/services/AuthService";

export default {
  props: {
    project: null,
  },
  data() {
    return {
      commitMessage: "",
      selectedFiles: [],
    };
  },
  async created() {},
  methods: {
    async clickClose(namespace, podname) {
      this.$emit("onClose", {});
    },
    async commit() {
      axios
        .post(
          `${(await Config.get()).SERVER_URL}/projects/${
            this.project.projectId
          }/operations/commit`,
          {
            files: this.selectedFiles,
            message: this.commitMessage,
          },
          await AuthService.getAuthHeader()
        )
        .then(async (res) => {
          EventBus.emit(EventTypes.ALERT_MESSAGE, {
            type: "info",
            text: "Committed",
          });
        })
        .catch(handleError);
    },
    async push() {
      axios
        .post(
          `${(await Config.get()).SERVER_URL}/projects/${
            this.project.projectId
          }/operations/push`,
          {},
          await AuthService.getAuthHeader()
        )
        .then(async (res) => {
          EventBus.emit(EventTypes.ALERT_MESSAGE, {
            type: "info",
            text: "Pushed",
          });
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
          (file) => file.path
        );
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
</style>
