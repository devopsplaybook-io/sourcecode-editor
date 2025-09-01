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
export default {
  props: {
    project: { type: Object, required: true },
  },
  data() {
    return {
      branchName: "",
      error: "",
    };
  },
  methods: {
    submit() {
      if (!this.branchName.trim()) {
        this.error = "Branch name is required";
        return;
      }
      this.$emit("onCreate", this.branchName.trim());
    },
    clickClose() {
      this.$emit("onClose");
    },
  },
};
</script>

<style scoped></style>
