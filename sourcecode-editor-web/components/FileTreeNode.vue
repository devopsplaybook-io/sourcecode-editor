<template>
  <li class="tree-node">
    <div class="node-content" @click="handleClick">
      <i v-if="!node.isFile && !isExpanded" class="bi bi-folder2 file-icon"></i>
      <i
        v-else-if="!node.isFile && isExpanded"
        class="bi bi-folder2-open file-icon"
      ></i>
      <i v-else class="bi bi-file-earmark file-icon"></i>
      <span class="node-name">{{ node.name }}</span>
      <span class="node-actions" @click.stop>
        <i v-if="node.isFile" class="bi bi-cursor-text" @click="emitRename" />
        <i
          v-if="node.isFile"
          class="bi bi-file-earmark-x"
          @click="emitDelete"
        />
        <i
          v-if="!node.isFile"
          class="bi bi-file-earmark-plus"
          @click="emitCreate"
        />
      </span>
    </div>

    <ul
      v-if="!node.isFile && isExpanded && node.children.length > 0"
      class="children"
    >
      <FileTreeNode
        v-for="child in node.children"
        :key="child.name"
        :node="child"
        @file-selected="$emit('file-selected', $event)"
        @delete-file="$emit('delete-file', $event)"
        @rename-file="$emit('rename-file', $event)"
        @create-file="$emit('create-file', $event)"
      />
    </ul>
  </li>
</template>

<script>
import { CodePreferencesService } from "~~/services/CodePreferencesService";

export default {
  name: "FileTreeNode",
  emits: ["file-selected", "delete-file", "rename-file", "create-file"],
  props: {
    node: {
      type: Object,
      required: true,
    },
    projectId: {
      type: String,
      required: false,
    },
  },
  data() {
    return {
      isExpanded: this.node.name === "/" ? true : this.isFolderExpanded(),
    };
  },
  methods: {
    getStorageKey() {
      return `code_preferences_expanded_folders_${this.projectId}`;
    },
    getExpandedFolders() {
      const key = this.getStorageKey();
      const stored = CodePreferencesService.get(key);
      return stored ? JSON.parse(stored) : [];
    },
    setExpandedFolders(folders) {
      const key = this.getStorageKey();
      CodePreferencesService.set(key, JSON.stringify(folders));
    },
    isFolderExpanded() {
      if (this.node.isFile) return false;
      const expanded = this.getExpandedFolders();
      return expanded.includes(this.node.path);
    },
    updateExpandedFolders(expand) {
      if (this.node.isFile) return;
      let expanded = this.getExpandedFolders();
      if (expand) {
        if (!expanded.includes(this.node.path)) expanded.push(this.node.path);
      } else {
        expanded = expanded.filter((p) => p !== this.node.path);
      }
      this.setExpandedFolders(expanded);
    },
    handleClick() {
      if (this.node.isFile) {
        this.$emit("file-selected", this.node.path);
      } else if (this.node.name !== "/") {
        this.isExpanded = !this.isExpanded;
        this.updateExpandedFolders(this.isExpanded);
      }
    },
    emitRename() {
      const newPath = prompt(
        "Enter new name or path for file:",
        this.node.path
      );
      if (newPath && newPath !== this.node.path) {
        this.$emit("rename-file", { oldPath: this.node.path, newPath });
      }
    },
    emitCreate() {
      const fileName = prompt("Enter new file name:");
      if (fileName) {
        this.$emit("create-file", { parentPath: this.node.path, fileName });
      }
    },
    emitDelete() {
      if (confirm(`Delete file '${this.node.name}'?`)) {
        this.$emit("delete-file", this.node.path);
      }
    },
  },
};
</script>
