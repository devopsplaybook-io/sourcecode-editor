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
      />
    </ul>
  </li>
</template>

<script>
export default {
  name: "FileTreeNode",
  props: {
    node: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      isExpanded: false,
    };
  },
  methods: {
    handleClick() {
      if (this.node.isFile) {
        this.$emit("file-selected", this.node.path);
      } else {
        this.isExpanded = !this.isExpanded;
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
  display: flex;
  align-items: center;
  padding: 2px 0;
  cursor: pointer;
  user-select: none;
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
</style>
