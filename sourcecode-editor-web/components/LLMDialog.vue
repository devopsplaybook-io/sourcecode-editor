<template>
  <dialog open>
    <article>
      <header>LLM Request for File: {{ file }}</header>
      <section>
        <div v-if="!response">
          <label>Query</label>
          <textarea
            v-model="prompt"
            placeholder="Enter your prompt..."
            rows="6"
            style="width: 100%"
          ></textarea>
        </div>
        <div v-else>
          <h4>Response:</h4>
          <pre>{{ response.explanation }}</pre>
          <textarea v-model="response.code_output" rows="10"></textarea>
        </div>
      </section>
      <footer>
        <button
          v-if="!response"
          @click="sendRequest"
          :disabled="loading || !prompt"
        >
          Send
        </button>
        <button v-else @click="acceptCode">Accept</button>
        <button @click="$emit('close')" style="margin-left: 0.5em">
          Cancel
        </button>
      </footer>
    </article>
  </dialog>
</template>

<script>
import axios from "axios";
import { AuthService } from "~~/services/AuthService";
import Config from "~~/services/Config.ts";
import { EventBus, EventTypes, handleError } from "~~/services/EventBus";
import { UtilsDecompressData, UtilsCompressData } from "~~/services/Utils";

export default {
  props: {
    file: String,
    fileName: String,
    projectId: String,
    show: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      prompt: "",
      response: "",
      error: "",
      loading: false,
    };
  },
  methods: {
    async sendRequest() {
      this.loading = true;
      this.response = "";
      this.error = "";
      try {
        const res = await axios.post(
          `${(await Config.get()).SERVER_URL}/projects/${
            this.projectId
          }/llm/file`,
          {
            file: this.file,
            prompt: this.prompt,
          },
          await AuthService.getAuthHeader()
        );
        this.response = JSON.parse(
          JSON.parse(await UtilsDecompressData(res.data.response)).code
        );
      } catch (e) {
        handleError(e);
      }
      this.loading = false;
    },
    async acceptCode() {
      this.$emit("codeUpdated", this.response.code_output);
    },
  },
};
</script>

<style></style>
