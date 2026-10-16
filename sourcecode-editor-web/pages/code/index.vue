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

    <div
      v-if="gitProjectsStore.fetching && !gitProjectsStore.projects.length"
      class="code-loading"
    >
      <Loading />
    </div>

    <div v-else-if="!gitProjectsStore.projects.length" class="code-empty-state">
      <i class="bi bi-folder-plus"></i>
      <p>No projects yet. Add a repository to start editing code.</p>
      <NuxtLink to="/projects/new" class="code-empty-state-action"
        >Add your first repository</NuxtLink
      >
    </div>

    <div v-else-if="!selectedProjectId" class="code-empty-state">
      <i class="bi bi-folder2-open"></i>
      <p>Select a project above to start editing.</p>
    </div>

    <div v-else id="code-layout-main">
      <div id="code-layout-files-tree">
        <FileTree
          :files="files"
          :projectId="selectedProjectId"
          @file-selected="openFileByPath"
          @rename-file="onRenameFile"
          @delete-file="onDeleteFile"
          @create-file="onCreateFile"
        />
      </div>
      <div id="code-layout-files-editor">
        <div id="code-editor-header">
          <EditorTabs
            :tabs="tabs"
            :activePath="activeTabPath"
            @activate="activateTab"
            @close="closeTab"
          />
          <div id="code-editor-header-actions">
            <span
              v-if="saveState !== 'idle'"
              id="code-save-state"
              :class="'save-state-' + saveState"
              >{{ saveStateLabel }}</span
            >
            <a
              href="#"
              v-if="activeTab"
              @click.prevent="showLLMDialog = true"
              ><i class="bi bi-robot"> LLM </i></a
            >
          </div>
        </div>
        <CodeEditor
          v-if="activeTab"
          :content="activeTab.content"
          :languagePath="activeTabPath"
          :gotoLine="pendingGotoLine"
          @change="onEditorChange"
          @goto-line-done="pendingGotoLine = null"
        />
        <div v-else class="code-empty-state">
          <i class="bi bi-file-earmark-code"></i>
          <p>
            Open a file from the tree, or press
            <kbd>Ctrl/Cmd</kbd>+<kbd>P</kbd> to search files.
          </p>
        </div>
        <LLMDialog
          v-if="showLLMDialog && activeTab"
          :file="activeTabPath"
          :fileName="activeTab.name"
          :projectId="selectedProjectId"
          :originalContent="activeTab.content"
          @codeUpdated="codeUpdated"
          @close="showLLMDialog = false"
        />
      </div>
      <div id="code-layout-changes">
        <ChangedFilesPanel
          :project="selectedProject"
          @open-commit="showCommitDialog = true"
        />
      </div>
    </div>

    <QuickOpen
      v-if="showQuickOpen"
      :files="files"
      @select="onQuickOpenSelect"
      @close="showQuickOpen = false"
    />
    <SearchPanel
      v-if="showSearchPanel && selectedProjectId"
      :projectId="selectedProjectId"
      @open="onSearchResultOpen"
      @close="showSearchPanel = false"
    />
    <DialogCommit
      v-if="showCommitDialog && selectedProject"
      :project="selectedProject"
      @onClose="showCommitDialog = false"
    />
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
import { RepositoryEventsService } from "~~/services/RepositoryEventsService";
import { RepositoryEventTypes } from "~~/services/RepositoryEventTypes";

export default {
  components: { FileTree },
  data() {
    return {
      files: [],
      selectedProjectId: null,
      tabs: [],
      activeTabPath: null,
      saveState: "idle",
      tabsRestoredForProject: false,
      showLLMDialog: false,
      showQuickOpen: false,
      showSearchPanel: false,
      showCommitDialog: false,
      pendingGotoLine: null,
      unbindFns: [],
      keydownHandler: null,
      beforeUnloadHandler: null,
    };
  },
  computed: {
    activeTab() {
      return this.tabs.find((tab) => tab.path === this.activeTabPath) || null;
    },
    selectedProject() {
      return (
        GitProjectsStore().projects.find(
          (project) => project.projectId === this.selectedProjectId
        ) || null
      );
    },
    saveStateLabel() {
      switch (this.saveState) {
        case "unsaved":
          return "Unsaved";
        case "saving":
          return "Saving…";
        case "saved":
          return "Saved";
        case "error":
          return "Save failed";
        default:
          return "";
      }
    },
  },
  async created() {
    if (!(await AuthenticationStore().ensureAuthenticated())) {
      useRouter().push({ path: "/users" });
    }
    await GitProjectsStore().fetch();
    this.loadLastSelectedProject();
    this.debouncedOnFileContentChange = debounce(this.saveTabContent, 1000);
    this.bindRepositoryEvents();
    this.keydownHandler = (e) => this.onGlobalKeydown(e);
    window.addEventListener("keydown", this.keydownHandler);
    this.beforeUnloadHandler = (e) => this.onBeforeUnload(e);
    window.addEventListener("beforeunload", this.beforeUnloadHandler);
  },
  beforeUnmount() {
    if (this.unbindFns) {
      this.unbindFns.forEach((fn) => fn());
      this.unbindFns = [];
    }
    if (this.keydownHandler) {
      window.removeEventListener("keydown", this.keydownHandler);
      this.keydownHandler = null;
    }
    if (this.beforeUnloadHandler) {
      window.removeEventListener("beforeunload", this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }
    if (this.debouncedOnFileContentChange) {
      this.debouncedOnFileContentChange.flush();
    }
  },
  methods: {
    bindRepositoryEvents() {
      // Refresh the file tree only when an event targets the active project.
      // Mirrors the "Conditional UI Refresh Based on Sync Event Relevance" rule:
      // ignore noise from unrelated repositories.
      const fileEvents = [
        RepositoryEventTypes.FILE_CREATED,
        RepositoryEventTypes.FILE_DELETED,
        RepositoryEventTypes.FILE_RENAMED,
      ];
      this.unbindFns = fileEvents.map((eventType) =>
        RepositoryEventsService.on(eventType, (event) => {
          if (
            this.selectedProjectId &&
            event.repository === this.selectedProjectId
          ) {
            this.fetchFiles();
          }
        }),
      );
    },
    loadLastSelectedProject() {
      const lastProjectId = CodePreferencesService.getLastProjectId();
      if (
        lastProjectId &&
        CodePreferencesService.isValidProject(
          lastProjectId,
          GitProjectsStore().projects,
        )
      ) {
        this.selectedProjectId = lastProjectId;
        this.tabsRestoredForProject = false;
        this.fetchFiles();
      }
    },
    async fetchFiles() {
      await axios
        .get(
          `${(await Config.get()).SERVER_URL}/projects/${
            this.selectedProjectId
          }/files`,
          await AuthService.getAuthHeader(),
        )
        .then(async (res) => {
          this.files = res.data.files;
        })
        .catch(handleError);
      if (!this.tabsRestoredForProject) {
        this.tabsRestoredForProject = true;
        await this.restoreOpenTabs();
      }
    },
    async onProjectChange() {
      CodePreferencesService.setLastProjectId(this.selectedProjectId);
      this.debouncedOnFileContentChange.flush();
      this.tabs = [];
      this.activeTabPath = null;
      this.saveState = "idle";
      this.tabsRestoredForProject = false;
      this.files = [];
      this.showLLMDialog = false;
      this.pendingGotoLine = null;
      await this.fetchFiles();
    },
    createTab(path) {
      return {
        path,
        name: path.split("/").pop() || path,
        content: "",
        savedContent: "",
        loaded: false,
        dirty: false,
        saving: false,
        needsResave: false,
      };
    },
    async restoreOpenTabs() {
      const savedPaths = CodePreferencesService.getOpenTabs(
        this.selectedProjectId,
      );
      const savedActivePath = CodePreferencesService.getActiveTabPath(
        this.selectedProjectId,
      );
      this.tabs = savedPaths
        .filter((path) => this.files.includes(path))
        .map((path) => this.createTab(path));
      const activeTab =
        this.tabs.find((tab) => tab.path === savedActivePath) ||
        this.tabs[0] ||
        null;
      this.activeTabPath = activeTab ? activeTab.path : null;
      if (activeTab) {
        await this.loadTabContent(activeTab);
      }
    },
    persistOpenTabs() {
      if (!this.selectedProjectId) return;
      CodePreferencesService.setOpenTabs(
        this.selectedProjectId,
        this.tabs.map((tab) => tab.path),
      );
      CodePreferencesService.setActiveTabPath(
        this.selectedProjectId,
        this.activeTabPath,
      );
    },
    async openFileByPath(path) {
      if (!path) return;
      let tab = this.tabs.find((existing) => existing.path === path);
      if (!tab) {
        tab = this.createTab(path);
        this.tabs.push(tab);
      }
      if (this.activeTabPath !== path) {
        this.debouncedOnFileContentChange.flush();
        this.activeTabPath = path;
        this.persistOpenTabs();
      }
      await this.loadTabContent(tab);
    },
    async activateTab(path) {
      if (path === this.activeTabPath) return;
      this.debouncedOnFileContentChange.flush();
      this.activeTabPath = path;
      this.pendingGotoLine = null;
      this.persistOpenTabs();
      await this.loadTabContent(this.activeTab);
    },
    async closeTab(path) {
      const tab = this.tabs.find((existing) => existing.path === path);
      if (!tab) return;
      if (
        tab.dirty &&
        !confirm(`'${tab.name}' has unsaved changes. Close anyway?`)
      ) {
        return;
      }
      this.debouncedOnFileContentChange.flush();
      const index = this.tabs.indexOf(tab);
      this.tabs.splice(index, 1);
      if (this.activeTabPath === path) {
        const nextTab = this.tabs[Math.max(0, index - 1)] || null;
        this.activeTabPath = nextTab ? nextTab.path : null;
        if (nextTab) {
          await this.loadTabContent(nextTab);
        }
      }
      this.persistOpenTabs();
    },
    async loadTabContent(tab) {
      // Resolve through this.tabs so mutations hit the reactive proxy
      // (a raw object reference would bypass Vue 3 reactivity).
      const current =
        this.tabs.find((existing) => existing.path === tab.path) || tab;
      if (!current || current.loaded) return;
      try {
        const res = await axios.post(
          `${(await Config.get()).SERVER_URL}/projects/${
            this.selectedProjectId
          }/files/content/retrieval`,
          { file: current.path },
          await AuthService.getAuthHeader(),
        );
        const content = JSON.parse(
          await UtilsDecompressData(res.data.file),
        ).content;
        current.content = content;
        current.savedContent = content;
        current.loaded = true;
        current.dirty = false;
      } catch (e) {
        handleError(e);
      }
    },
    onEditorChange(content) {
      const tab = this.activeTab;
      if (!tab) return;
      tab.content = content;
      tab.dirty = content !== tab.savedContent;
      if (tab.dirty) {
        this.saveState = "unsaved";
        this.debouncedOnFileContentChange(tab);
      }
    },
    async saveTabContent(tab) {
      if (!tab) return;
      if (tab.saving) {
        tab.needsResave = true;
        return;
      }
      if (!tab.dirty) return;
      tab.saving = true;
      const sentContent = tab.content;
      this.saveState = "saving";
      try {
        await axios.post(
          `${(await Config.get()).SERVER_URL}/projects/${
            this.selectedProjectId
          }/files/content/update`,
          { file: tab.path, content: await UtilsCompressData(sentContent) },
          await AuthService.getAuthHeader(),
        );
        tab.savedContent = sentContent;
        tab.dirty = tab.content !== tab.savedContent;
        if (tab.dirty) {
          // Content changed while the save was in flight: re-send it.
          tab.needsResave = true;
        }
      } catch (e) {
        tab.dirty = tab.content !== tab.savedContent;
        this.saveState = "error";
        EventBus.emit(EventTypes.ALERT_MESSAGE, {
          type: "error",
          text: "Autosave failed — your changes are kept in the editor; press Ctrl/Cmd+S to retry",
        });
      } finally {
        tab.saving = false;
        if (tab.needsResave) {
          tab.needsResave = false;
          if (tab.dirty) {
            this.saveTabContent(tab);
          }
        } else if (this.saveState === "saving") {
          this.saveState = this.tabs.some((other) => other.dirty)
            ? "unsaved"
            : "saved";
        }
      }
    },
    async saveNow() {
      const tab = this.activeTab;
      if (!tab) return;
      this.debouncedOnFileContentChange.flush();
      if (tab.dirty) {
        await this.saveTabContent(tab);
      }
    },
    async codeUpdated(content) {
      this.showLLMDialog = false;
      const tab = this.activeTab;
      if (!tab) return;
      this.debouncedOnFileContentChange.flush();
      tab.content = content;
      tab.dirty = content !== tab.savedContent;
      if (tab.dirty) {
        await this.saveTabContent(tab);
      }
    },
    onGlobalKeydown(e) {
      const modKey = e.ctrlKey || e.metaKey;
      if (!modKey) return;
      const key = (e.key || "").toLowerCase();
      if (key === "p" && !e.shiftKey) {
        e.preventDefault();
        this.showQuickOpen = !this.showQuickOpen;
      } else if (key === "f" && e.shiftKey) {
        e.preventDefault();
        this.showSearchPanel = !this.showSearchPanel;
      } else if (key === "s") {
        e.preventDefault();
        this.saveNow();
      }
    },
    onBeforeUnload(e) {
      if (this.tabs.some((tab) => tab.dirty)) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    },
    async onQuickOpenSelect(path) {
      this.showQuickOpen = false;
      await this.openFileByPath(path);
    },
    async onSearchResultOpen(match) {
      this.showSearchPanel = false;
      await this.openFileByPath(match.path);
      this.pendingGotoLine = null;
      this.$nextTick(() => {
        this.pendingGotoLine = match.line;
      });
    },
    async onRenameFile({ oldPath, newPath }) {
      try {
        await axios.post(
          `${(await Config.get()).SERVER_URL}/projects/${
            this.selectedProjectId
          }/files/rename`,
          { oldPath, newPath },
          await AuthService.getAuthHeader(),
        );
        this.files = this.files.map((path) =>
          path === oldPath ? newPath : path,
        );
        const tab = this.tabs.find((existing) => existing.path === oldPath);
        if (tab) {
          tab.path = newPath;
          tab.name = newPath.split("/").pop() || newPath;
          if (this.activeTabPath === oldPath) {
            this.activeTabPath = newPath;
          }
          this.persistOpenTabs();
        }
        // file.renamed event will refresh the tree.
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
          await AuthService.getAuthHeader(),
        );
        this.files = this.files.filter((path) => path !== filePath);
        const tab = this.tabs.find((existing) => existing.path === filePath);
        if (tab) {
          const index = this.tabs.indexOf(tab);
          this.tabs.splice(index, 1);
          if (this.activeTabPath === filePath) {
            const nextTab = this.tabs[Math.max(0, index - 1)] || null;
            this.activeTabPath = nextTab ? nextTab.path : null;
            if (nextTab) {
              await this.loadTabContent(nextTab);
            }
          }
          this.persistOpenTabs();
        }
        // file.deleted event will refresh the tree.
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
          await AuthService.getAuthHeader(),
        );
        // file.created event will refresh the tree.
      } catch (e) {
        handleError(e);
      }
    },
  },
};
</script>

<style>
select {
  padding: var(--pad-inline) var(--pad-container);
  height: 2.6rem;
}

#code-layout {
  display: grid;
  max-height: 100%;
  height: 100%;
  grid-template-rows: auto 1fr;
  gap: var(--gap-inline);
}

#code-layout-main {
  display: grid;
  grid-template-areas: "tree editor changes";
  grid-template-columns: minmax(160px, 22%) minmax(0, 1fr) minmax(180px, 20%);
  gap: var(--gap-inline);
  min-height: 0;
}

#code-layout-files-tree {
  grid-area: tree;
  height: 100%;
  overflow: auto;
  min-height: 0;
}

#code-layout-files-editor {
  grid-area: editor;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

#code-layout-changes {
  grid-area: changes;
  height: 100%;
  min-height: 0;
  overflow: auto;
}

#code-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--gap-inline);
}

#code-editor-header-actions {
  display: flex;
  align-items: center;
  gap: var(--gap-inline);
  white-space: nowrap;
}

#code-editor-header-actions a {
  cursor: pointer;
  text-decoration: none;
}

#code-save-state {
  font-size: var(--font-label);
  padding: var(--pad-tight) var(--pad-inline);
  border-radius: var(--radius-default);
  white-space: nowrap;
}

.save-state-unsaved {
  opacity: var(--opacity-muted);
}

.save-state-saving {
  font-style: italic;
  opacity: var(--opacity-muted);
}

.save-state-saved {
  color: #3a8a3a;
}

.save-state-error {
  color: #b04a4a;
  font-weight: bold;
}

.code-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--pad-page);
  opacity: var(--opacity-muted);
  text-align: center;
}

.code-empty-state i {
  font-size: var(--font-icon-xl);
  margin-bottom: var(--gap-inline);
}

.code-empty-state-action {
  margin-top: var(--gap-inline);
}

.code-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--pad-page);
}

@media (max-width: 900px) {
  #code-layout-main {
    grid-template-areas:
      "editor"
      "tree"
      "changes";
    grid-template-columns: 1fr;
    grid-template-rows: minmax(200px, 1fr) 25dvh auto;
  }
}
</style>
