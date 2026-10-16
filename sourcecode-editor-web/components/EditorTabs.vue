<template>
  <div id="editor-tabs" role="tablist">
    <button
      v-for="tab in tabs"
      :key="tab.path"
      role="tab"
      :aria-selected="tab.path === activePath"
      :class="['editor-tab', { 'editor-tab-active': tab.path === activePath }]"
      :title="tab.path"
      @click="$emit('activate', tab.path)"
    >
      <span class="editor-tab-dirty" v-if="tab.dirty" title="Unsaved changes"
        >●</span
      >
      <span class="editor-tab-name">{{ tab.name }}</span>
      <span
        class="editor-tab-close"
        title="Close tab"
        @click.stop="$emit('close', tab.path)"
        ><i class="bi bi-x"></i
      ></span>
    </button>
  </div>
</template>

<script>
export default {
  name: "EditorTabs",
  props: {
    tabs: { type: Array, default: () => [] },
    activePath: { type: String, default: null },
  },
  emits: ["activate", "close"],
};
</script>

<style scoped>
#editor-tabs {
  display: flex;
  align-items: stretch;
  gap: 2px;
  overflow-x: auto;
  min-height: 2.2rem;
}

.editor-tab {
  display: inline-flex;
  align-items: center;
  gap: var(--gap-tight);
  padding: var(--pad-tight) var(--pad-inline);
  border: none;
  border-radius: 0;
  background: transparent;
  color: inherit;
  font-size: var(--font-meta, 0.75rem);
  cursor: pointer;
  white-space: nowrap;
  max-width: 14rem;
  box-shadow: none;
  opacity: var(--opacity-muted);
  margin-bottom: 0;
}

.editor-tab:hover,
.editor-tab:focus {
  opacity: var(--opacity-hover);
}

.editor-tab-active {
  opacity: var(--opacity-hover);
  border-bottom: 2px solid var(--pico-primary, #41729f);
}

.editor-tab-name {
  overflow: hidden;
  text-overflow: ellipsis;
}

.editor-tab-dirty {
  color: var(--pico-primary, #41729f);
  font-size: var(--font-label, 0.65rem);
}

.editor-tab-close {
  display: inline-flex;
  align-items: center;
  opacity: var(--opacity-muted);
}

.editor-tab-close:hover {
  opacity: var(--opacity-hover);
}
</style>
