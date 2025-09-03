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
export default {
  name: "FileTreeNode",
  emits: ["file-selected", "delete-file", "rename-file", "create-file"],
  props: {
    node: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      isExpanded: this.node.name === "/" ? true : false,
    };
  },
  methods: {
    handleClick() {
      if (this.node.isFile) {
        this.$emit("file-selected", this.node.path);
      } else if (this.node.name !== "/") {
        this.isExpanded = !this.isExpanded;
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

<style scoped>
.tree-node {
  margin: 0;
  padding: 0;
  list-style: none;
}

.node-content {
  display: grid;
  align-items: center;
  padding: 2px 0;
  cursor: pointer;
  user-select: none;
  grid-template-columns: auto 1fr auto;
}

.folder-icon,
.file-icon {
  margin-right: 0.3rem;
  font-size: 1rem;
}

.node-name {
  font-size: 1rem;
}

.children {
  list-style: none;
  padding-left: 1em;
  margin: 0;
}
.node-actions i {
  margin-left: 0.5rem;
  cursor: pointer;
}
</style>
