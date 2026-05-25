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
        Create Branch
      </header>
      <input
        v-model="branchName"
        type="text"
        placeholder="Branch name"
        @keyup.enter="submit"
        autofocus
      />
      <div class="action-controls">
        <button @click="submit" :disabled="!branchName">Create</button>
        <button @click="clickClose">Cancel</button>
      </div>
    </article>
  </dialog>
</template>

<script>
import axios from "axios";
import Config from "~~/services/Config.ts";
import { handleError, EventBus, EventTypes } from "~~/services/EventBus";
import { AuthService } from "~~/services/AuthService";

export default {
  props: {
    project: { type: Object, required: true },
  },
  data() {
    return {
      branchName: "",
    };
  },
  methods: {
    async submit() {
      if (!this.branchName.trim()) {
        EventBus.emit(EventTypes.ALERT_MESSAGE, {
          type: "info",
          text: "Branch deleted: " + branch,
        });
        return;
      }
      await axios
        .post(
          `${(await Config.get()).SERVER_URL}/projects/${
            this.project.projectId
          }/operations/branch/create`,
          { branch: this.branchName.trim() },
          await AuthService.getAuthHeader()
        )
        .then(() => {
          EventBus.emit(EventTypes.ALERT_MESSAGE, {
            type: "info",
            text: "Branch created: " + this.branchName.trim(),
          });
          this.$emit("onClose");
        })
        .catch(handleError);
    },
    clickClose() {
      this.$emit("onClose");
    },
  },
};
</script>

<style scoped></style>
