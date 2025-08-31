<template>
  <ul class="file-tree">
    <li v-for="file in files" :key="file">
      <span @click="selectFile(file)" style="cursor: pointer"
        >📄 {{ file }}</span
      >
    </li>
  </ul>
</template>

<script>
export default {
  name: "FileTree",
  props: {
    files: {
      type: Array,
      required: true,
    },
  },
  methods: {
    isFolder(node) {
      return node.children && node.children.length > 0;
    },
    selectFile(node) {
      this.$emit("file-selected", node);
    },
  },
  components: {
    FileTree: null,
  },
  created() {},
};
</script>

<style scoped>
.file-tree {
  list-style: none;
  padding-left: 1em;
}
.file-tree li {
  margin: 0.2em 0;
}
</style>
