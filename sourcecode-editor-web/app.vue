<script setup>
function updateAppHeight() {
  const height = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty("--app-height", `${height}px`);
}

onMounted(() => {
  updateAppHeight();
  window.addEventListener("resize", updateAppHeight);
  window.visualViewport?.addEventListener("resize", updateAppHeight);
});
</script>

<template>
  <div id="page-layout">
    <header>
      <VitePwaManifest />
      <Navigation />
    </header>
    <main>
      <NuxtPage />
      <AlertMessages id="page-alert-messages" />
    </main>
  </div>
</template>

<script>
export default {};
</script>

<style>
#page-layout {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto 1fr;
  width: 100vw;
  height: var(--app-height, 100dvh);
  overflow: hidden !important;
}

/* Layout */

header {
  height: 3em;
}

header,
main {
  padding: var(--pad-inline);
}

main {
  grid-column: 1;
  grid-row: 2;
  overflow-x: hidden;
  overflow-y: auto;
  width: 100%;
  height: auto;
}

#page-alert-messages {
  position: fixed;
  right: 3rem;
  bottom: 3rem;
  max-width: 80vw;
}

/* Common Component */

.actions i {
  font-size: 1.3em;
  cursor: pointer;
  margin-left: var(--gap-inline);
  margin-right: var(--gap-inline);
}

@media (prefers-color-scheme: dark) {
  .actions i {
    color: #bcc6ce;
  }
}
@media (prefers-color-scheme: light) {
  .actions i {
    color: #1d2832;
  }
}

.action-controls button {
  font-size: var(--font-body);
  padding: var(--pad-button);
  margin-right: var(--gap-inline);
}

/* Files */

.file-tree {
  list-style: none;
  padding-left: 0;
  margin: 0;
}

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
  margin-right: var(--gap-tight);
  font-size: var(--font-body-large);
}

.node-name {
  font-size: var(--font-body-large);
  border-bottom: 1px solid #66666666;
}

.children {
  list-style: none;
  padding-left: var(--pad-container);
  margin: 0;
}
.node-actions i {
  margin-left: var(--gap-inline);
  cursor: pointer;
}

/* Aninations */

.fade-in-slow {
  animation: fadeIn 2s;
}
.fade-in-fast {
  animation: fadeIn 0.5s;
}
@keyframes fadeIn {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

.blink {
  transition: all 1s ease-in-out;
  animation: blink normal 3s infinite ease-in-out;
}
@keyframes blink {
  0% {
    color: inherit;
  }
  50% {
    color: #039be5;
  }
  100% {
    color: inherit;
  }
}
</style>
