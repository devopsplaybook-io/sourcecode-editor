<template>
  <dialog open id="llm-dialog">
    <article>
      <header>LLM Request for File: {{ fileName || file }}</header>
      <section>
        <div v-if="loading" class="llm-loading">
          <Loading />
          <p class="llm-loading-hint">
            The model is processing your request. This may take a moment...
          </p>
        </div>
        <div v-else-if="!response">
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
          <textarea
            v-model="response.code_output"
            rows="10"
            style="width: 100%"
          ></textarea>
        </div>
      </section>
      <footer>
        <button
          v-if="!response && !loading"
          @click="sendRequest"
          :disabled="loading || !prompt"
        >
          Send
        </button>
        <button
          v-if="response && !loading"
          @click="showDiff = true"
          style="margin-left: 0.5em"
        >
          View Diff
        </button>
        <button
          v-if="response && !loading"
          @click="acceptCode"
          style="margin-left: 0.5em"
        >
          Accept
        </button>
        <button @click="$emit('close')" style="margin-left: 0.5em">
          Cancel
        </button>
      </footer>
    </article>
    <DialogFileDiff
      v-if="showDiff"
      :title="fileName || file"
      :originalContent="originalContent"
      :modifiedContent="response ? response.code_output : ''"
      @onClose="showDiff = false"
    />
  </dialog>
</template>

<script>
import axios from "axios";
import { AuthService } from "~~/services/AuthService";
import Config from "~~/services/Config.ts";
import { EventBus, EventTypes, handleError } from "~~/services/EventBus";
import { UtilsDecompressData, UtilsCompressData } from "~~/services/Utils";
import Loading from "~/components/Loading.vue";
import DialogFileDiff from "~/components/DialogFileDiff.vue";

export default {
  components: { Loading, DialogFileDiff },
  props: {
    file: String,
    fileName: String,
    projectId: String,
    originalContent: { type: String, default: "" },
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
      showDiff: false,
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
          await AuthService.getAuthHeader(),
        );
        this.response = JSON.parse(
          JSON.parse(await UtilsDecompressData(res.data.response)).code,
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

<style scoped>
.llm-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2em 1em;
  gap: 0.5em;
}
.llm-loading-hint {
  margin: 0;
  font-size: 0.9em;
  color: #888;
}
</style>
