<template>
  <div id="code-layout">
    <select
      id="code-layout-actions"
      v-model="selectedProjectId"
      @change="onProjectChange"
    >
      <option disabled value="">Select a project</option>
      <option
        v-for="project in gitProjectsStore.projects"
        :key="project.projectId"
        :value="project.projectId"
      >
        {{ project.name }}
      </option>
    </select>
    <div v-if="selectedProjectId" id="code-layout-files-tree">
      <FileTree
        :files="files"
        :projectId="selectedProjectId"
        @file-selected="onFileSelected"
        @rename-file="onRenameFile"
        @delete-file="onDeleteFile"
        @create-file="onCreateFile"
      />
    </div>
    <div id="code-layout-files-editor">
      <a href="#" v-if="fileActive" @click="showLLMDialog = true"
        ><i class="bi bi-robot"> LLM </i></a
      >
      <textarea
        v-model="fileContent"
        id="code-editor-textarea"
        spellcheck="false"
        @input="onFileContentInput"
      ></textarea>
      <LLMDialog
        v-if="showLLMDialog"
        :file="fileActive"
        :fileName="fileActive.name || fileActive.path"
        :projectId="selectedProjectId"
        @codeUpdated="codeUpdated"
        @close="showLLMDialog = false"
      />
    </div>
  </div>
</template>

<script setup>
const gitProjectsStore = GitProjectsStore();
</script>

<script>
import axios from "axios";
import FileTree from "~/components/FileTree.vue";
import { AuthService } from "~~/services/AuthService";
import Config from "~~/services/Config.ts";
import { EventBus, EventTypes, handleError } from "~~/services/EventBus";
import { UtilsDecompressData, UtilsCompressData } from "~~/services/Utils";
import { CodePreferencesService } from "~~/services/CodePreferencesService";
import debounce from "lodash/debounce";

export default {
  components: { FileTree },
  data() {
    return {
      files: [],
      selectedProjectId: null,
      fileContent: "",
      fileActive: null,
      showLLMDialog: false,
    };
  },
  async created() {
    if (!(await AuthenticationStore().ensureAuthenticated())) {
      useRouter().push({ path: "/users" });
    }
    await GitProjectsStore().fetch();
    this.loadLastSelectedProject();
    this.debouncedOnFileContentChange = debounce(
      this.onFileContentChange,
      1000
    );
  },
  methods: {
    loadLastSelectedProject() {
      const lastProjectId = CodePreferencesService.getLastProjectId();
      if (
        lastProjectId &&
        CodePreferencesService.isValidProject(
          lastProjectId,
          GitProjectsStore().projects
        )
      ) {
        this.selectedProjectId = lastProjectId;
        this.fetchFiles();
      }
    },
    async fetchFiles() {
      await axios
        .get(
          `${(await Config.get()).SERVER_URL}/projects/${
            this.selectedProjectId
          }/files`,
          await AuthService.getAuthHeader()
        )
        .then(async (res) => {
          this.files = res.data.files;
        })
        .catch(handleError);
    },
    onProjectChange() {
      CodePreferencesService.setLastProjectId(this.selectedProjectId);
      this.fileActive = null;
      this.fileContent = "";
      this.fetchFiles();
    },
    async onFileSelected(file) {
      this.fileActive = file;
      this.fileContent = "";
      axios
        .post(
          `${(await Config.get()).SERVER_URL}/projects/${
            this.selectedProjectId
          }/files/content/retrieval`,
          { file },
          await AuthService.getAuthHeader()
        )
        .then(async (res) => {
          this.fileContent = JSON.parse(
            await UtilsDecompressData(res.data.file)
          ).content;
        })
        .catch(handleError);
    },
    async onRenameFile({ oldPath, newPath }) {
      try {
        await axios.post(
          `${(await Config.get()).SERVER_URL}/projects/${
            this.selectedProjectId
          }/files/rename`,
          { oldPath, newPath },
          await AuthService.getAuthHeader()
        );
        this.fetchFiles();
      } catch (e) {
        handleError(e);
      }
    },
    async onDeleteFile(filePath) {
      try {
        await axios.post(
          `${(await Config.get()).SERVER_URL}/projects/${
            this.selectedProjectId
          }/files/delete`,
          { filePath },
          await AuthService.getAuthHeader()
        );
        this.fetchFiles();
        if (this.fileActive && this.fileActive.path === filePath) {
          this.fileActive = null;
          this.fileContent = "";
        }
      } catch (e) {
        handleError(e);
      }
    },
    async onCreateFile({ parentPath, fileName }) {
      try {
        await axios.post(
          `${(await Config.get()).SERVER_URL}/projects/${
            this.selectedProjectId
          }/files/create`,
          { parentPath, fileName },
          await AuthService.getAuthHeader()
        );
        this.fetchFiles();
      } catch (e) {
        handleError(e);
      }
    },
    onFileContentInput() {
      this.debouncedOnFileContentChange(this.fileContent);
    },
    async onFileContentChange(content) {
      axios
        .post(
          `${(await Config.get()).SERVER_URL}/projects/${
            this.selectedProjectId
          }/files/content/update`,
          { file: this.fileActive, content: await UtilsCompressData(content) },
          await AuthService.getAuthHeader()
        )
        .catch(handleError);
    },
    async codeUpdated(content) {
      this.showLLMDialog = false;
      this.fileContent = content;
      this.onFileContentChange(content);
    },
  },
};
</script>

<style>
select {
  padding: 0.5em 1em;
  height: 2.6rem;
}

#code-layout {
  display: grid;
  max-height: 100%;
  height: 100%;
  grid-template-rows: auto auto 1fr;
}

#code-layout-files-tree {
  height: 30dvh;
  overflow: auto;
}

#code-layout-files-editor {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}

#code-editor-textarea {
  width: 100%;
  height: 100%;
  min-height: 200px;
  resize: none;
  font-family: monospace;
  font-size: 1em;
  padding: 1em;
  box-sizing: border-box;
}
#code-layout-files-editor a {
  margin: 0.4rem;
  text-align: right;
  cursor: pointer;
  text-decoration: none;
}
</style>
