<template>
  <ul class="file-tree">
    <FileTreeNode
      :node="rootNode"
      @file-selected="onFileSelected"
      @delete-file="$emit('delete-file', $event)"
      @rename-file="$emit('rename-file', $event)"
      @create-file="$emit('create-file', $event)"
    />
  </ul>
</template>

<script>
import FileTreeNode from "./FileTreeNode.vue";

export default {
  name: "FileTree",
  emits: ["file-selected", "delete-file", "rename-file", "create-file"],
  props: {
    files: {
      type: Array,
      required: true,
    },
  },
  components: {
    FileTreeNode,
  },
  computed: {
    treeData() {
      return this.buildTree(this.files);
    },
    rootNode() {
      return {
        name: "/",
        path: "",
        isFile: false,
        children: this.treeData,
      };
    },
  },
  methods: {
    buildTree(files) {
      const tree = {};

      files.forEach((filepath) => {
        const parts = filepath.split("/");
        let current = tree;

        parts.forEach((part, index) => {
          if (!current[part]) {
            current[part] = {
              name: part,
              path: parts.slice(0, index + 1).join("/"),
              isFile: index === parts.length - 1,
              children: {},
            };
          }
          current = current[part].children;
        });
      });

      return this.convertToArray(tree);
    },

    convertToArray(obj) {
      return Object.values(obj)
        .map((node) => ({
          ...node,
          children: node.isFile ? [] : this.convertToArray(node.children),
        }))
        .sort((a, b) => {
          if (a.isFile !== b.isFile) {
            return a.isFile ? 1 : -1;
          }
          return a.name.localeCompare(b.name);
        });
    },

    onFileSelected(filepath) {
      this.$emit("file-selected", filepath);
    },
  },
};
</script>

<style scoped>
.file-tree {
  list-style: none;
  padding-left: 0;
  margin: 0;
}
</style>
