<template>
  <article
    id="dialog-create-pr-backdrop"
    class="dialog-backdrop"
    v-on:click.self="close"
  >
    <div class="dialog-container">
      <header>
        <strong
          ><i class="bi bi-git-pull-request"></i> Create Pull Request:
          {{ orgName }}/{{ repoName }}</strong
        >
      </header>
      <div class="dialog-body">
        <label for="pr-title">Title</label>
        <input
          id="pr-title"
          v-model="title"
          type="text"
          placeholder="PR title"
          required
        />

        <div class="dialog-row">
          <div class="dialog-field">
            <label for="pr-head">Head branch</label>
            <input
              id="pr-head"
              v-model="head"
              type="text"
              placeholder="feature-branch"
              required
            />
          </div>
          <div class="dialog-field">
            <label for="pr-base">Base branch</label>
            <input
              id="pr-base"
              v-model="base"
              type="text"
              placeholder="main"
              required
            />
          </div>
        </div>
      </div>
      <footer>
        <button class="outline contrast" @click="close">Cancel</button>
        <button
          @click="create"
          :disabled="!title.trim() || !head.trim() || !base.trim()"
        >
          Create PR
        </button>
      </footer>
    </div>
  </article>
</template>

<script>
export default {
  props: {
    orgName: { type: String, required: true },
    repoName: { type: String, required: true },
    defaultBranch: { type: String, default: "main" },
  },
  emits: ["onClose", "onCreate"],
  data() {
    return {
      title: "",
      head: "",
      base: this.defaultBranch || "main",
    };
  },
  methods: {
    close() {
      this.$emit("onClose");
    },
    create() {
      if (!this.title.trim() || !this.head.trim() || !this.base.trim()) return;
      this.$emit(
        "onCreate",
        this.orgName,
        this.repoName,
        this.title.trim(),
        this.head.trim(),
        this.base.trim(),
      );
    },
  },
};
</script>

<style scoped>
.dialog-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}
.dialog-container {
  width: 100%;
  max-width: 480px;
  background: var(--pico-card-background-color, #1a1d1e);
  border-radius: 8px;
  padding: 1rem;
}
.dialog-container header {
  margin-bottom: 0.75rem;
}
.dialog-container footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 0;
}
.dialog-body {
  display: grid;
  gap: 0.75rem;
}
.dialog-body label {
  margin-bottom: 0.2rem;
  font-size: 0.85rem;
}
.dialog-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
.dialog-field {
  display: grid;
}
@media (max-width: 400px) {
  .dialog-row {
    grid-template-columns: 1fr;
  }
}
</style>
