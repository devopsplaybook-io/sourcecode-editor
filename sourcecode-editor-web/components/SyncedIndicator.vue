<template>
  <span v-if="ts" class="synced-indicator" :title="titleText">
    <i class="bi bi-arrow-repeat"></i>
    Synced {{ relativeTime(ts) }}
  </span>
</template>

<script>
export default {
  props: {
    ts: { type: Number, default: 0 },
  },
  data() {
    return {
      now: Date.now(),
      tickTimer: null,
    };
  },
  computed: {
    titleText() {
      return new Date(this.ts).toLocaleString();
    },
  },
  mounted() {
    this.tickTimer = setInterval(() => {
      this.now = Date.now();
    }, 30000);
  },
  unmounted() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  },
  methods: {
    relativeTime(ts) {
      const seconds = Math.floor((this.now - ts) / 1000);
      if (seconds < 60) return "just now";
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes} min ago`;
      const hours = Math.floor(minutes / 60);
      return `${hours} h ago`;
    },
  },
};
</script>

<style scoped>
.synced-indicator {
  display: inline-flex;
  align-items: center;
  gap: var(--gap-tight, 0.3em);
  font-size: var(--font-meta, 0.8em);
  opacity: var(--opacity-muted, 0.6);
  white-space: nowrap;
}
</style>
